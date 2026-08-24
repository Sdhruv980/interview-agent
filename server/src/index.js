require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const connectDB          = require('./config/db');
const healthRouter       = require('./routes/health');
const authRouter         = require('./routes/auth');
const interviewsRouter   = require('./routes/interviews');
const usersRouter        = require('./routes/users');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────
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

// ── 404 + global error handler ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Boot ───────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () =>
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
    );
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();

module.exports = app; // exported for testing
