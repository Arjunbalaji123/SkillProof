import { Router } from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profileRoutes.js';
import skillsRoutes from './skillsRoutes.js';
import assessmentsRoutes from './assessmentsRoutes.js';
import projectsRoutes from './projectsRoutes.js';
import recruiterRoutes from './recruiterRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/skills', skillsRoutes);
router.use('/assessments', assessmentsRoutes);
router.use('/projects', projectsRoutes);
router.use('/recruiter', recruiterRoutes);
router.use('/admin', adminRoutes);

// Alias /recruiters to /recruiter for backward compatibility
router.use('/recruiters', recruiterRoutes);

export default router;
