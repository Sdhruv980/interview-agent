const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');

const healthRouter     = require('./routes/health');
const authRouter       = require('./routes/auth');
const interviewsRouter = require('./routes/interviews');
const usersRouter      = require('./routes/users');
const paymentsRouter   = require('./routes/payments');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ── Security & utility middleware ──────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/health',     healthRouter);
app.use('/api/auth',       authRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/users',      usersRouter);
app.use('/api/payments',   paymentsRouter);
const path = require('path');

// ── Production static assets serving (if client/dist exists) ────────────────
const clientDist = path.join(__dirname, '../../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ── 404 + global error handler ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
