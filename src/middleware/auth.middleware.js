import jwt from 'jsonwebtoken';

/**
 * 1. verifyToken
 * Validates the Authorization Bearer token header and attaches verified claims to req.user.
 * Rejects missing, malformed, invalid, or expired tokens with HTTP 401.
 */
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check for presence of Authorization header and Bearer scheme
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Access token is missing or malformed.',
      });
    }

    // 2. Extract token from header
    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Token cannot be empty.',
      });
    }

    // 3. Verify server-side secret configuration
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('Server configuration error: JWT_SECRET is not configured.');
      return res.status(500).json({
        success: false,
        message: 'Internal server configuration error.',
      });
    }

    // 4. Verify token using explicit HS256 algorithm
    const decoded = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });

    // 5. Attach verified payload to req.user
    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Access token has expired.',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Invalid access token.',
    });
  }
}

/**
 * 2. verifyStudent
 * Allows access only when authenticated user role is strictly 'student'.
 * Rejects role mismatches with HTTP 403 Forbidden.
 */
export function verifyStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Student access required.',
    });
  }
  return next();
}

/**
 * 3. verifyTutor
 * Allows access only when authenticated user role is strictly 'tutor'.
 * Rejects role mismatches with HTTP 403 Forbidden.
 */
export function verifyTutor(req, res, next) {
  if (!req.user || req.user.role !== 'tutor') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Tutor access required.',
    });
  }
  return next();
}

/**
 * 4. verifyAdmin
 * Allows access only when authenticated user role is strictly 'admin'.
 * Rejects role mismatches with HTTP 403 Forbidden.
 */
export function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden. Admin access required.',
    });
  }
  return next();
}

