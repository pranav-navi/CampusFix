const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');

// Some Windows networks block the SRV lookup that mongodb+srv:// needs.
// Using public DNS servers fixes "querySrv ECONNREFUSED".
if (env.mongoUri.startsWith('mongodb+srv://')) {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
}

mongoose.set('strictQuery', true);

async function connectDB(uri = env.mongoUri) {
  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

module.exports = connectDB;