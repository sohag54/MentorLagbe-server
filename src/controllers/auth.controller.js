import jwt from 'jsonwebtoken';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../config/auth.js';

// Allowed roles according to Assignment 9 Category 001 specification
const ALLOWED_ROLES = ['student', 'tutor', 'admin'];

// Chosen token expiration: 7 days ('7d')
// Rationale: Aligns with Better Auth standard session duration, providing seamless
// continuity for authenticated users across tuition management and dashboard interactions
// without requiring premature re-login, while still bounding credential validity.
const JWT_EXPIRES_IN = '7d';

/**
 * Controller to issue a verified JWT based strictly on an active Better Auth session.
 * Rejects requests without a valid session or with invalid roles.
 * Client-supplied body/query data is never trusted or used.
 */
export async function issueJwt(req, res) {
  try {
    // 1. Retrieve the verified session from Better Auth using request headers
    const sessionData = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    // 2. Reject unauthenticated requests
    if (!sessionData || !sessionData.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. No active session found.',
      });
    }

    const verifiedUser = sessionData.user;
    const role = verifiedUser.role ? verifiedUser.role.toLowerCase() : null;

    // 3. Validate user role against permitted system roles
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. User role is invalid or not permitted.',
      });
    }

    // 4. Verify server-side JWT_SECRET availability
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('Server configuration error: JWT_SECRET is not configured.');
      return res.status(500).json({
        success: false,
        message: 'Internal server configuration error.',
      });
    }

    // 5. Construct token payload strictly from verified database session record
    const payload = {
      userId: verifiedUser.id || verifiedUser._id,
      email: verifiedUser.email,
      name: verifiedUser.name,
      role: role,
    };

    // 6. Sign JWT token with server secret
    const token = jwt.sign(payload, jwtSecret, { expiresIn: JWT_EXPIRES_IN });

    // 7. Return signed token and safe, necessary user details
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: verifiedUser.id || verifiedUser._id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        role: role,
        plan: verifiedUser.plan || 'free',
      },
    });
  } catch (error) {
    console.error('Error issuing JWT token:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to issue authentication token.',
    });
  }
}

