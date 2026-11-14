const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

async function start() {
  try {
    await connectDB();
    app.listen(env.port, () => {
      console.log(`CampusFix API running on http://localhost:${env.port} (${env.nodeEnv})`);
      console.log(`File storage: ${env.useCloudinary ? 'Cloudinary' : 'local disk (/uploads)'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

start();
