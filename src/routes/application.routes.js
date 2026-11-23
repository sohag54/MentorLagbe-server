import express from 'express';
import {
  createApplication,
  getMyApplications,
  getStudentDashboardStats,
  cancelApplication,
  getTutorApplications,
  getApplicationsForTuition,
  updateApplicationStatus,
} from '../controllers/application.controller.js';
import {
  verifyToken,
  verifyStudent,
  verifyTutor,
} from '../middleware/auth.middleware.js';

const router = express.Router();

// ==========================================
// Student-Protected Routes
// ==========================================

// GET /api/student/stats - Student views their dashboard overview statistics
router.get('/student/stats', verifyToken, verifyStudent, getStudentDashboardStats);

// POST /api/applications - Student submits an application to an approved & active tuition post
router.post('/applications', verifyToken, verifyStudent, createApplication);

// GET /api/my-applications - Student views their own submitted applications
router.get('/my-applications', verifyToken, verifyStudent, getMyApplications);

// DELETE /api/applications/:id - Student cancels their pending application
router.delete('/applications/:id', verifyToken, verifyStudent, cancelApplication);

// ==========================================
// Tutor-Protected Routes
// ==========================================

// GET /api/tutor/applications - Tutor views all applications across their tuition posts
router.get('/tutor/applications', verifyToken, verifyTutor, getTutorApplications);

// GET /api/tuitions/:tuitionId/applications - Tutor views applications for a specific tuition post
router.get('/tuitions/:tuitionId/applications', verifyToken, verifyTutor, getApplicationsForTuition);

// PATCH /api/applications/:id/status - Tutor accepts or rejects an application
router.patch('/applications/:id/status', verifyToken, verifyTutor, updateApplicationStatus);

export default router;

