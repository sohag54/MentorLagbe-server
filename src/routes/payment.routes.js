import express from 'express';
import { createCheckoutSession } from '../controllers/payment.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/payment/create-checkout-session - Authenticated Checkout Session creation
router.post('/payment/create-checkout-session', verifyToken, createCheckoutSession);

export default router;

