const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusfix',
  timezone: process.env.APP_TIMEZONE || 'Asia/Kolkata',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'campusfix',
  },
  upload: {
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 5,
    maxFiles: Number(process.env.MAX_FILES) || 5,
  },
};

env.isProduction = env.nodeEnv === 'production';
env.useCloudinary = Boolean(
  env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret
);

if (env.isProduction && env.jwtSecret === 'dev_only_secret_change_me') {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
