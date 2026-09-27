const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
require('dns').setDefaultResultOrder('ipv4first')
require('dotenv').config()
// 接入routes in index.js
const authRoutes = require('./routes/authRoutes')
const bidRoutes = require('./routes/bidRoutes')
const adminRoutes = require('./routes/adminRoutes')
const individualRoutes = require('./routes/individualRoutes')
const bandRoutes = require('./routes/bandRoutes')
const {
  requireAuth,
  rejectSpoofedUserId,
  bindAuthenticatedUserId,
  rejectSpoofedAdminId
} = require('./middleware/auth')
const app = express()

app.set('trust proxy', 1)
app.use(helmet())
app.use(express.json({ limit: '1mb' }))

const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' }
})

const teleToken = process.env.TELEGRAMBOT_TOKEN;
const { bot }  = require('./telebot');

app.use(cors({
  origin(origin, callback) {
    // Requests without an Origin header are service-to-service requests, such as
    // health checks and Telegram webhooks; browser requests must be allow-listed.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(null, false)
  },
  credentials: false,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'OPTIONS']
}))

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/request-otp', authLimiter)
app.use('/api/auth/verify-otp', authLimiter)
app.use('/api/auth/request-reset-otp', authLimiter)
app.use('/api/auth/reset-password', authLimiter)
app.use('/api/auth/bump-admin', authLimiter)

app.get('/api/ping', (req, res) => {
  res.json({ ok: true })
})

app.post(`/bot${teleToken}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

if (process.env.ENABLE_SCHEDULE_JOBS === 'true') {
  require('./schedule')
}

app.use('/api/auth', authRoutes)
app.use('/api/bids', requireAuth, rejectSpoofedUserId, bindAuthenticatedUserId, bidRoutes)
app.use('/api/admin', requireAuth, rejectSpoofedAdminId, adminRoutes)
app.use('/api/individual', requireAuth, rejectSpoofedUserId, bindAuthenticatedUserId, individualRoutes)
app.use('/api/band', requireAuth, rejectSpoofedUserId, bindAuthenticatedUserId, bandRoutes)


app.get('/', (req, res) => {
  res.send('JukeBox backend is running!')
})

app.get('/test', (req, res) => {
  res.json({ message: 'JukeBox backend is running!' })
})

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'An unexpected server error occurred.' })
})

const port = Number(process.env.PORT) || 3001
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
