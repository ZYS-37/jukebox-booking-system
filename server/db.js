/*
const mysql = require('mysql2')
require('dotenv').config()

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD,
  database: 'jukebox'
})

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err)
    return
  }
  console.log('Connected to MySQL database!')
})

module.exports = db
*/
// connect to ws local ubuntu mysql


/*
const mysql = require('mysql2')
require('dotenv').config()

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT)
})

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err)
    return
  }
  console.log('Connected to MySQL database!')
})

module.exports = db

console.log(process.env.DB_HOST, process.env.DB_USER, process.env.DB_NAME, process.env.DB_PORT)
*/

const mysql = require('mysql2')
require('dotenv').config()

const readBoolean = (value) => ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())

// Managed databases such as Aiven use TLS. Prefer a base64-encoded CA in a
// hosting dashboard; it avoids losing PEM line breaks when saving env values.
const getSslOptions = () => {
  if (!readBoolean(process.env.DB_SSL)) return undefined

  const ca = process.env.DB_SSL_CA_BASE64
    ? Buffer.from(process.env.DB_SSL_CA_BASE64, 'base64').toString('utf8')
    : process.env.DB_SSL_CA?.replace(/\\n/g, '\n')

  return {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ...(ca ? { ca } : {})
  }
}

const sslOptions = getSslOptions()

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(sslOptions ? { ssl: sslOptions } : {}),

  timezone:'Z',

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  connectTimeout: 30000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})

// test database connection when backend starts.
db.query('SELECT 1 AS ok', (err, results) => {
  if (err) {
    console.error('Database connection failed:', err)
    return
  }

  console.log('Database connected successfully:', results)
})

module.exports = db
