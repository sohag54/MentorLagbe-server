import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import dotenv from 'dotenv';
import { client } from './db.js';

dotenv.config();

const dbName = process.env.DB_NAME || 'mentorlagbe';
const db = client.db(dbName);

const isProduction =
  process.env.NODE_ENV === 'production' ||
  process.env.BETTER_AUTH_URL?.startsWith('https://');

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
    usePlural: true,
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  trustedOrigins: [process.env.CLIENT_URL || 'http://localhost:3000'],
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      sameSite: isProduction ? 'none' : 'lax',
      secure: isProduction,
    },
  },
  emailAndPassword: {
    enabled: true,
  },
  user: {
    modelName: 'user',
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

