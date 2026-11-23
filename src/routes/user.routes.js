import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getAdminUsers,
  updateUserRoleAdmin,
  getAdminDashboardStats,
} from '../controllers/user.controller.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// ==========================================
// User Profile Routes (Protected: verifyToken)
// ==========================================

// GET /api/users/profile - Authenticated user retrieves their own profile
router.get('/users/profile', verifyToken, getUserProfile);

// PATCH /api/users/profile - Authenticated user updates their own profile
router.patch('/users/profile', verifyToken, updateUserProfile);

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

