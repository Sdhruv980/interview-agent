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

app.use(helmet({
  contentSecurityPolicy: false, // Prevents helmet from blocking Razorpay modal and external APIs
}));

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, curl, Postman, localhost, and all onrender.com origins
    if (!origin || origin.includes('localhost') || origin.includes('onrender.com') || (process.env.CLIENT_URL && origin === process.env.CLIENT_URL)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
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
