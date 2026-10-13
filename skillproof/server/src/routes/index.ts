import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import skillsRoutes from './skillsRoutes.js';
import assessmentsRoutes from './assessmentsRoutes.js';
import projectsRoutes from './projectsRoutes.js';
import recruiterRoutes from './recruiterRoutes.js';
import adminRoutes from './adminRoutes.js';
import leaderboardRoutes from './leaderboardRoutes.js';
import userRoutes from './userRoutes.js';
import messageRoutes from './messageRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/profile', profileRoutes);
router.use('/skills', skillsRoutes);
router.use('/dashboard', skillsRoutes);
router.use('/assessments', assessmentsRoutes);
router.use('/projects', projectsRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/messages', messageRoutes);
router.use('/admin', adminRoutes);

// Alias /recruiters to /recruiter for backward compatibility
router.use('/recruiters', recruiterRoutes);

export default router;
