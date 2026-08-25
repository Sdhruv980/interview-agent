// Must be the very first lines — fix Node's DNS resolver for MongoDB Atlas SRV
// on Windows where the local DNS stub refuses SRV record queries
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google public DNS — resolves Atlas SRV reliably

require('dotenv').config();

const app       = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () =>
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`)
  );

  // Catch port-in-use and other listen errors — prevents the unhandled error crash
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use.`);
      console.error(`   Run this in PowerShell to free it:`);
      console.error(`   Get-NetTCPConnection -LocalPort ${PORT} | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }\n`);
    } else {
      console.error('Server error:', err.message);
    }
    process.exit(1);
  });
};

start();
