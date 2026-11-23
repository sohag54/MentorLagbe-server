import express from 'express';
import { uploadImage } from '../controllers/upload.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// POST /api/upload/image - Authenticated image upload to ImgBB
router.post('/upload/image', verifyToken, uploadImage);

export default router;

