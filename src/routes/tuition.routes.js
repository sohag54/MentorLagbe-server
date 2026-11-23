import express from 'express';
import {
  getPublicTuitions,
  getTuitionById,
  createTuition,
  getMyTuitions,
  updateTuition,
  deleteTuition,
  getAllTuitionsAdmin,
  updateTuitionStatusAdmin,
} from '../controllers/tuition.controller.js';
import {
  verifyToken,
  verifyTutor,
  verifyAdmin,
} from '../middleware/auth.middleware.js';

const router = express.Router();

// ==========================================
// Public Routes
// ==========================================

// GET /api/tuitions - Browse approved & active tuitions with search/filters
router.get('/tuitions', getPublicTuitions);

// GET /api/tuitions/:id - View approved & active tuition details
router.get('/tuitions/:id', getTuitionById);

// ==========================================
// Tutor-Protected Routes
// ==========================================

// POST /api/tuitions - Tutor creates a new tuition post (pending approval, plan-enforced)
router.post('/tuitions', verifyToken, verifyTutor, createTuition);

// GET /api/my-tuitions - Tutor views their own tuition posts
router.get('/my-tuitions', verifyToken, verifyTutor, getMyTuitions);

// PATCH /api/tuitions/:id - Tutor updates their own tuition post
router.patch('/tuitions/:id', verifyToken, verifyTutor, updateTuition);

// DELETE /api/tuitions/:id - Tutor deletes their own tuition post
router.delete('/tuitions/:id', verifyToken, verifyTutor, deleteTuition);

// ==========================================
// Admin-Protected Routes
// ==========================================

// GET /api/admin/tuitions - Admin views all tuition posts (pending, approved, rejected)
router.get('/admin/tuitions', verifyToken, verifyAdmin, getAllTuitionsAdmin);

// PATCH /api/admin/tuitions/:id/status - Admin approves/rejects a tuition post
router.patch('/admin/tuitions/:id/status', verifyToken, verifyAdmin, updateTuitionStatusAdmin);

// Alias: PATCH /api/tuitions/:id/status - Admin route alias for status update
router.patch('/tuitions/:id/status', verifyToken, verifyAdmin, updateTuitionStatusAdmin);

export default router;

