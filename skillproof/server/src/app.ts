import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import { prisma } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || '../uploads');

// Request Logging & Security Middleware
app.use(requestLogger);
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static file uploads safely
app.use('/uploads', express.static(uploadDir, {
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

// API Routes
app.use('/api', apiRoutes);

// Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 SKILLPROOF Server running at http://localhost:${PORT}`);
    console.log(`📁 Static Uploads directory: ${uploadDir}`);
  });
}

export default app;

