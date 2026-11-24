import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { connectDB } from './config/db.js';
import { auth } from './config/auth.js';
import authRouter from './routes/auth.routes.js';
import tuitionRouter from './routes/tuition.routes.js';
import applicationRouter from './routes/application.routes.js';
import uploadRouter from './routes/upload.routes.js';
import paymentRouter from './routes/payment.routes.js';
import userRouter from './routes/user.routes.js';
import { handleStripeWebhook } from './controllers/payment.controller.js';

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middleware
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// API routes (mounted before Better Auth wildcard to handle custom endpoints)
app.use('/api', authRouter);

// Better Auth route handler (mounted before express.json for request body stream handling)
app.all('/api/auth/{*splat}', toNodeHandler(auth));

// Stripe Webhook route with raw buffer parsing (mounted strictly BEFORE express.json)
app.post(
  '/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// Body parsing middleware for application routes (up to 10MB for base64 uploads)
app.use(express.json({ limit: '10mb' }));

// Business API routes
app.use('/api', tuitionRouter);
app.use('/api', applicationRouter);
app.use('/api', uploadRouter);
app.use('/api', paymentRouter);
app.use('/api', userRouter);

// Root health-check endpoint: simple server-running message
app.get('/', (req, res) => {
  res.send('MentorLagbe Server is running');
});

// API health endpoint: JSON health status
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MentorLagbe Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Start Express server after establishing MongoDB connection
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`MentorLagbe Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server failed to start due to database connection error:', error.message);
    process.exit(1);
  }
}

startServer();
