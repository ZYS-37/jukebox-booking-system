const { Pool, types } = require('pg')
require('dotenv').config()

const { compileSql, toLegacyCompatibleResult } = require('./dbCompat')

// PostgreSQL COUNT/BIGINT values are strings by default. The application only
// stores small identifiers and counts, so returning Numbers preserves the
// response shape that the existing callback-based routes expect.
types.setTypeParser(20, Number)

const readBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const getSslOptions = () => {
  const enabled = readBoolean(process.env.DB_SSL, process.env.NODE_ENV === 'production')
  if (!enabled) return false

  const ca = process.env.DB_SSL_CA_BASE64
    ? Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8')
    : process.env.DB_SSL_CA?.replace(/\\n/g, '\n')

  return {
    rejectUnauthorized: readBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
    ...(ca ? { ca } : {})
  }
}

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not configured. Database requests will fail until it is set.')
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getSslOptions(),
  max: Number(process.env.DB_POOL_MAX || 10),
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  keepAlive: true
})

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err)
})

function normalizeError(err) {
  // Preserve the duplicate-entry signal expected by legacy route handlers.
  if (err && err.code === '23505') err.errno = 1062
  return err
}

function query(sql, params, callback) {
  if (typeof params === 'function') {
    callback = params
    params = []
  }

  const compiled = compileSql(sql, params || [])
  const promise = pool
    .query(compiled.text, compiled.values)
    .then(toLegacyCompatibleResult)
    .catch((err) => {
      throw normalizeError(err)
    })

  if (callback) {
    promise.then((result) => callback(null, result)).catch((err) => callback(err))
  }

  return promise
}

query('SELECT 1 AS ok', (err) => {
  if (err) {
    console.error('Database connection failed:', err.message)
    return
  }

  console.log('Connected to PostgreSQL database.')
})

module.exports = { query, pool }
