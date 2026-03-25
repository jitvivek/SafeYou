import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './database/init.js';
import { seedDatabase } from './database/seed.js';
import authRoutes from './routes/auth.js';
import repoRoutes from './routes/repos.js';
import scanRoutes from './routes/scans.js';
import reportRoutes from './routes/reports.js';
import planRoutes from './routes/plans.js';
import publicScanRoutes from './routes/publicScan.js';
import remediationRoutes from './routes/remediation.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in MVP
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize database and start server
async function start() {
  await initDatabase();
  seedDatabase();

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'SafeYou API', version: '1.0.0' });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/repos', repoRoutes);
  app.use('/api/scans', scanRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/public', publicScanRoutes);
  app.use('/api/remediation', remediationRoutes);

  // Serve static frontend in production
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const clientBuildPath = path.join(__dirname, '../../client/dist');

  app.use(express.static(clientBuildPath));

  // SPA fallback — serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  });

  app.listen(PORT, () => {
    console.log(`🛡️  SafeYou API running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
