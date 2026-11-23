import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { connectDB } from './config/db.js';
import { auth } from './config/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middleware
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

// Better Auth route handler (mounted before express.json for request body stream handling)
app.all('/api/auth/{*splat}', toNodeHandler(auth));

// Body parsing middleware for application routes
app.use(express.json());

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
