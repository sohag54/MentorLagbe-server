import express from 'express';
import { issueJwt } from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * POST /api/jwt
 * Issues a signed JWT based on a verified Better Auth session cookie.
 */
router.post('/jwt', issueJwt);

export default router;

