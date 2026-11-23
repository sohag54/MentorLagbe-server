import express from 'express';
import {
  getAdminUsers,
  updateUserRoleAdmin,
  getAdminDashboardStats,
} from '../controllers/user.controller.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// ==========================================
// Admin Dashboard Overview Statistics Route (Protected)
// ==========================================

// GET /api/admin/stats - Admin Dashboard Overview Statistics
router.get('/admin/stats', verifyToken, verifyAdmin, getAdminDashboardStats);

// ==========================================
// Admin User Management Routes (Protected)
// ==========================================

// GET /api/admin/users - Admin retrieves all registered platform users
router.get('/admin/users', verifyToken, verifyAdmin, getAdminUsers);

// PATCH /api/admin/users/:id/role - Admin updates a user's role ('student' | 'tutor' | 'admin')
router.patch('/admin/users/:id/role', verifyToken, verifyAdmin, updateUserRoleAdmin);

export default router;

