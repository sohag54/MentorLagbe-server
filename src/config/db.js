import { MongoClient, ServerApiVersion } from 'mongodb';
import dns from 'node:dns';
import dotenv from 'dotenv';

dotenv.config();

// Fix for Windows / local DNS servers that fail to resolve SRV records (ECONNREFUSED)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Fall back to default system DNS if custom servers cannot be set
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'mentorlagbe';

if (!uri) {
  throw new Error('MONGODB_URI is not defined in the environment variables.');
}

// Initialize MongoClient with Server API version 1
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db = null;

/**
 * Connect to MongoDB and verify the connection
 */
export async function connectDB() {
  try {
    await client.connect();
    // Ping admin database to confirm connection
    await client.db('admin').command({ ping: 1 });
    db = client.db(dbName);
    console.log(`Successfully connected to MongoDB database: ${dbName}`);
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
}

/**
 * Helper to retrieve the active database instance
 */
export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Please call connectDB first.');
  }
  return db;
}

export { client };
