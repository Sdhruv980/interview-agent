const express  = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const DB_STATES = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

// GET /api/health
router.get('/', (_req, res) => {
  res.status(200).json({
    success:     true,
    message:     'Interview Agent API is running',
    timestamp:   new Date().toISOString(),
    uptime:      process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database:    { status: DB_STATES[mongoose.connection.readyState] || 'unknown' },
    version:     process.env.npm_package_version || '1.0.0',
  });
});

module.exports = router;
