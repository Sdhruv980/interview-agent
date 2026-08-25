const mongoose = require('mongoose');
const dns      = require('dns');

// Node 18+ defaults to IPv6 for DNS lookups which breaks MongoDB Atlas SRV
// records on some Windows/ISP configurations. Force IPv4 first and use Google DNS.
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // give Atlas 10s to respond
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    // Give a clearer message for the most common Atlas errors
    if (err.code === 'ECONNREFUSED' || err.message?.includes('querySrv')) {
      console.error('MongoDB connection failed — check that:');
      console.error('  1. Your IP is whitelisted in Atlas Network Access');
      console.error('  2. MONGODB_URI in .env is correct (no surrounding quotes)');
    } else if (err.message?.includes('Authentication failed')) {
      console.error('MongoDB auth failed — check username/password in MONGODB_URI');
    } else {
      console.error('MongoDB connection error:', err.message);
    }
    throw err; // re-throw so index.js can catch and exit
  }
};

module.exports = connectDB;
