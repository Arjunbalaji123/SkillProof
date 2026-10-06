import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import skillsRoutes from './skillsRoutes.js';
import projectsRoutes from './projectsRoutes.js';
import educationRoutes from './educationRoutes.js';
import certificationsRoutes from './certificationsRoutes.js';
import achievementsRoutes from './achievementsRoutes.js';
import assessmentsRoutes from './assessmentsRoutes.js';
import verificationRoutes from './verificationRoutes.js';
import recruiterRoutes from './recruiterRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reportsRoutes from './reportsRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/skills', skillsRoutes);
router.use('/projects', projectsRoutes);
router.use('/education', educationRoutes);
router.use('/certifications', certificationsRoutes);
router.use('/achievements', achievementsRoutes);
router.use('/assessments', assessmentsRoutes);
router.use('/verifications', verificationRoutes);
router.use('/recruiters', recruiterRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportsRoutes);

export default router;

