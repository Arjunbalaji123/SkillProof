import dotenv from 'dotenv';
dotenv.config();

import helmet from 'helmet';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { prisma } from './config/db.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { requireAuth } from './middleware/auth.js';
import { requireAdmin } from './middleware/role.js';
import { ProctorService } from './services/proctorService.js';
import { SocketService } from './services/socketService.js';
import { OpeningService } from './services/openingService.js';
import { LeaderboardService } from './services/leaderboardService.js';
import { serveProctorSnapshot } from './controllers/adminController.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const app = express();
const httpServer = http.createServer(app);
SocketService.init(httpServer);

const PORT = process.env.PORT || 5000;
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads');
const serverUploadsDir = path.resolve(process.cwd(), 'uploads');

// Helmet & Security Headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// HTTP Caching Policy: send Cache-Control: no-store on all API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

// Request Logging & Security Middleware
app.use(requestLogger);
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Proctor snapshots are accessible ONLY to admins
app.get('/uploads/proctor/:filename', requireAuth, requireAdmin, serveProctorSnapshot);

// Serve static file uploads safely (excluding raw access to sensitive proof PDFs and proctor snapshots)
app.use('/uploads', (req, res, next) => {
  if (req.path.startsWith('/proof_') || req.path.startsWith('/proctor')) {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required.' });
  }
  next();
}, express.static(uploadDir, {
  dotfiles: 'ignore',
  index: false,
}), express.static(serverUploadsDir, {
  dotfiles: 'ignore',
  index: false,
}));

// Health check with DB status
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      error: 'Database unavailable',
    });
  }
});

// Mount API Routes (excluding auth from global limiter)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) {
    return next();
  }
  return apiRateLimiter(req, res, next);
}, apiRoutes);

// Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  // Run initial 30-day proctor snapshot cleanup and schedule periodic jobs
  ProctorService.cleanupExpiredSnapshots().catch(() => {});
  OpeningService.backfillInterestsFromVerifiedSkills().catch(() => {});
  OpeningService.expireOverdueOpenings().catch(() => {});

  setInterval(() => {
    ProctorService.cleanupExpiredSnapshots().catch(() => {});
  }, 6 * 60 * 60 * 1000); // every 6 hours

  // Hourly job: set expired openings to EXPIRED and validate leaderboard consistency
  setInterval(() => {
    OpeningService.expireOverdueOpenings().catch(() => {});
  }, 60 * 60 * 1000); // every 1 hour

  setInterval(() => {
    LeaderboardService.validateConsistency().catch(() => {});
  }, 60 * 60 * 1000); // every 1 hour

  setInterval(() => {
    ProctorService.monitorActiveHeartbeats().catch(() => {});
  }, 10 * 1000); // every 10 seconds

  httpServer.listen(Number(PORT), () => {
    console.log(`🚀 SKILLPROOF Server & Socket.IO running on port ${PORT}`);
    console.log(`📁 Static Uploads directory: ${uploadDir}`);
  });
}

export { httpServer };
export default app;


