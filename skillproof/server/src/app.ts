import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { prisma } from './config/db.js';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads');

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request Logging & Security Middleware
app.use(requestLogger);
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static file uploads safely (excluding raw access to sensitive proof PDFs)
app.use('/uploads', (req, res, next) => {
  if (req.path.startsWith('/proof_')) {
    return res.status(403).json({ success: false, message: 'Access denied. Use protected document endpoint.' });
  }
  next();
}, express.static(uploadDir, {
  dotfiles: 'ignore',
  index: false,
}));

// Health check with DB status
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      database: 'connected',
      app: 'SKILLPROOF Backend Engine',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
      app: 'SKILLPROOF Backend Engine',
      error: err?.message || 'Database unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

// Apply Rate Limiters & API Routes
app.use('/api/auth/login', authRateLimiter);
app.use('/api/auth/register', authRateLimiter);
app.use('/api', apiRateLimiter, apiRoutes);

// Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 SKILLPROOF Server running at http://localhost:${PORT}`);
    console.log(`📁 Static Uploads directory: ${uploadDir}`);
  });
}

export default app;

