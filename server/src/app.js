const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');
const { UPLOAD_DIR } = require('./utils/storage');

const app = express();

app.use(
  helmet({
    // allow the React app (different origin in dev) to display locally stored images
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        // Cloudinary images + blob: previews of photos picked in the upload form
        imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        // Manrope web font
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
      },
    },
  })
);
app.use(
  cors({
    origin: env.clientUrl.split(',').map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.nodeEnv !== 'test') app.use(morgan(env.isProduction ? 'combined' : 'dev'));

// Local upload fallback (only used when Cloudinary is not configured)
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

app.get('/api/health', (_req, res) =>
  res.json({ success: true, status: 'ok', storage: env.useCloudinary ? 'cloudinary' : 'local', time: new Date() })
);
app.use('/api', routes);

// Serve the built React app in production (single-server deploy)
if (env.isProduction) {
  const dist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
