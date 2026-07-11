import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import apiRouter from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware Setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static Client Folder Serving - serve the frontend/dist or frontend folder
const distPath = path.join(__dirname, '../../frontend/dist');
const devPath = path.join(__dirname, '../../frontend');
const staticPath = fs.existsSync(distPath) ? distPath : devPath;
app.use(express.static(staticPath));

// Also serve root-level files (css, js folders for the root index.html)
const rootPath = path.join(__dirname, '../..');
app.use('/css', express.static(path.join(rootPath, 'css')));
app.use('/js', express.static(path.join(rootPath, 'js')));


// API routes mount
app.use('/api/v1', apiRouter);

// Spectator route redirection fallback to index.html
app.get('/spectator', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ status: 'error', message: 'index.html not found' });
    }
  });
});

// Catch-all fallback for SPA routing
app.get('*', (req, res, next) => {
  // Don't intercept API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next(); // Let error handler deal with it
    }
  });
});

// Error handling
app.use(errorHandler);

// Start listening
app.listen(config.port, () => {
  logger.info(`Server listening on port ${config.port} in ${config.env} mode`);
  logger.info(`Serving static client files from: ${staticPath}`);
  logger.info(`OSRM Base URL: ${config.osrmBaseUrl}`);
  logger.info(`Nominatim Base URL: ${config.nominatimBaseUrl}`);
});
