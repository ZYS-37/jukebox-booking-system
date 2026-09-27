const jwt = require('jsonwebtoken')
const db = require('../db')

function getJwtSecret() {
  return process.env.JWT_SECRET
}

function createAccessToken(userId) {
  const secret = getJwtSecret()

  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return jwt.sign(
    { sub: String(userId) },
    secret,
    {
      algorithm: 'HS256',
      audience: 'jukebox-api',
      issuer: 'jukebox-api',
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    }
  )
}

function requireAuth(req, res, next) {
  const secret = getJwtSecret()
  const header = req.get('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''

  if (!secret) {
    return res.status(500).json({ error: 'Server authentication is not configured.' })
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  let payload
  try {
    payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      audience: 'jukebox-api',
      issuer: 'jukebox-api'
    })
  } catch {
    return res.status(401).json({ error: 'Your session is invalid or has expired.' })
  }

  const userId = Number(payload.sub)
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(401).json({ error: 'Your session is invalid.' })
  }

  db.query(
    `SELECT id, username, email, role, status, is_mr_certified, band_id, telegram_chat_id
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
    (err, users) => {
      if (err) return next(err)

      const user = users[0]
      if (!user || user.status !== 'approved') {
        return res.status(403).json({ error: 'This account is not permitted to access the system.' })
      }

      req.user = user
      next()
    }
  )
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access is required.' })
  }

  next()
}

function rejectSpoofedUserId(req, res, next) {
  const claimedUserIds = [
    req.params?.user_id,
    req.query?.user_id,
    req.body?.user_id
  ].filter(value => value !== undefined && value !== null && value !== '')

  const hasMismatch = claimedUserIds.some(value => Number(value) !== Number(req.user.id))
  if (hasMismatch) {
    return res.status(403).json({ error: 'You cannot act on behalf of another user.' })
  }

  next()
}

function bindAuthenticatedUserId(req, res, next) {
  // The existing route handlers expect user_id in their request body/query.
  // Bind that legacy field to the verified identity so handlers cannot select
  // another account even while the routes are gradually refactored to req.user.
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body.user_id = req.user.id
  }

  const query = { ...req.query, user_id: String(req.user.id) }
  Object.defineProperty(req, 'query', {
    configurable: true,
    enumerable: true,
    value: query
  })

  next()
}

function rejectSpoofedAdminId(req, res, next) {
  const claimedAdminId = req.body?.admin_user_id

  if (
    claimedAdminId !== undefined &&
    claimedAdminId !== null &&
    claimedAdminId !== '' &&
    Number(claimedAdminId) !== Number(req.user.id)
  ) {
    return res.status(403).json({ error: 'You cannot act on behalf of another administrator.' })
  }

  next()
}

module.exports = {
  createAccessToken,
  requireAuth,
  requireAdmin,
  rejectSpoofedUserId,
  bindAuthenticatedUserId,
  rejectSpoofedAdminId
}
