import express from 'express';
import {
  createCheckoutSession,
  getAdminStripeRevenue,
  getAdminTransactions,
} from '../controllers/payment.controller.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// ==========================================
// Authenticated Checkout Routes
// ==========================================

// POST /api/payment/create-checkout-session - Student / Tutor Checkout Session creation
router.post('/payment/create-checkout-session', verifyToken, createCheckoutSession);

// ==========================================
// Admin-Protected Stripe Revenue & Transaction Routes
// ==========================================

// GET /api/admin/payments/revenue & /api/admin/revenue - Total Stripe Platform Revenue
router.get('/admin/payments/revenue', verifyToken, verifyAdmin, getAdminStripeRevenue);
router.get('/admin/revenue', verifyToken, verifyAdmin, getAdminStripeRevenue);

// GET /api/admin/payments/transactions & /api/admin/transactions - Stripe Transactions Management Table
router.get('/admin/payments/transactions', verifyToken, verifyAdmin, getAdminTransactions);
router.get('/admin/transactions', verifyToken, verifyAdmin, getAdminTransactions);

export default router;

