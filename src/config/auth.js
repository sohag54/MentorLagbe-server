import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import dotenv from 'dotenv';
import { client } from './db.js';

dotenv.config();

const dbName = process.env.DB_NAME || 'mentorlagbe';
const db = client.db(dbName);

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
    usePlural: true,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  trustedOrigins: [process.env.CLIENT_URL || 'http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: 'users',
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'student',
        input: true,
      },
      plan: {
        type: 'string',
        required: false,
        defaultValue: 'free',
        input: false,
      },
      phone: {
        type: 'string',
        required: false,
        defaultValue: '',
      },
      bio: {
        type: 'string',
        required: false,
        defaultValue: '',
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          // Safeguard: strictly allow only 'student' or 'tutor' via public registration
          // Admin role cannot be assigned during signup; plan is locked to 'free'
          const requestedRole = user.role?.toLowerCase();
          const role = requestedRole === 'tutor' ? 'tutor' : 'student';

          return {
            data: {
              ...user,
              role,
              plan: 'free',
            },
          };
        },
      },
    },
  },
});

