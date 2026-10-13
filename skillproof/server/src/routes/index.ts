import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import meRoutes from './meRoutes.js';
import skillsRoutes from './skillsRoutes.js';
import assessmentsRoutes from './assessmentsRoutes.js';
import projectsRoutes from './projectsRoutes.js';
import recruiterRoutes from './recruiterRoutes.js';
import adminRoutes from './adminRoutes.js';
import leaderboardRoutes from './leaderboardRoutes.js';
import userRoutes from './userRoutes.js';
import messageRoutes from './messageRoutes.js';
import openingRoutes, { approachRouter } from './openingRoutes.js';
import notificationRoutes from './notificationRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/profile', profileRoutes);
router.use('/me', meRoutes);
router.use('/skills', skillsRoutes);
router.use('/dashboard', skillsRoutes);
router.use('/assessments', assessmentsRoutes);
router.use('/projects', projectsRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/recruiters', recruiterRoutes);
router.use('/openings', openingRoutes);
router.use('/approaches', approachRouter);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
