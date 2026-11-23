import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

const ALLOWED_ROLES = ['student', 'tutor', 'admin'];

/**
 * 1. GET /api/users/profile (Protected: verifyToken)
 * Retrieves the authenticated user's own profile using req.user.email.
 * Accessible to any authenticated role (student, tutor, admin).
 * Returns safe profile fields: _id, name, email, role, plan, image, phone, bio, createdAt, updatedAt.
 * Returns HTTP 404 if the user record does not exist in the database.
 * Never exposes passwords, authentication secrets, tokens, or sessions.
 */
export async function getUserProfile(req, res) {
  try {
    const userEmail = req.user?.email;
    if (!userEmail || typeof userEmail !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Valid email claim required in token.',
      });
    }

    const db = getDB();
    const normalizedEmail = userEmail.trim().toLowerCase();

    const user = await db.collection('users').findOne(
      {
        $or: [
          { email: normalizedEmail },
          { email: userEmail.trim() },
        ],
      },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          plan: 1,
          image: 1,
          phone: 1,
          bio: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const safeUser = {
      _id: user._id,
      name: user.name || 'User',
      email: user.email || '',
      role: user.role || 'student',
      plan: user.plan || 'free',
      image: user.image || '',
      phone: user.phone || '',
      bio: user.bio || '',
      createdAt: user.createdAt || null,
      updatedAt: user.updatedAt || null,
    };

    return res.status(200).json({
      success: true,
      user: safeUser,
      data: safeUser,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
    });
  }
}

/**
 * 2. PATCH /api/users/profile (Protected: verifyToken)
 * Updates the authenticated user's own profile using req.user.email.
 * Allows updating only safe personal fields: name, phone, bio, image.
 * Validates input types, limits excessive lengths, and prevents blank name.
 * Strictly ignores or rejects any attempts to modify email, role, plan, _id, or other protected fields.
 * Identity is never derived from request body or query parameters.
 * Returns the updated safe profile document.
 */
export async function updateUserProfile(req, res) {
  try {
    const userEmail = req.user?.email;
    if (!userEmail || typeof userEmail !== 'string') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Valid email claim required in token.',
      });
    }

    const db = getDB();
    const normalizedEmail = userEmail.trim().toLowerCase();

    // 1. Verify target user exists
    const existingUser = await db.collection('users').findOne({
      $or: [
        { email: normalizedEmail },
        { email: userEmail.trim() },
      ],
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    const { name, phone, bio, image } = req.body || {};
    const updateFields = {};

    // 2. Validate name (if provided)
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid name. Name must be a string.',
        });
      }
      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty.',
        });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot exceed 100 characters.',
        });
      }
      updateFields.name = trimmedName;
    }

    // 3. Validate phone (if provided)
    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone. Phone must be a string.',
        });
      }
      const trimmedPhone = phone.trim();
      if (trimmedPhone.length > 30) {
        return res.status(400).json({
          success: false,
          message: 'Phone number cannot exceed 30 characters.',
        });
      }
      updateFields.phone = trimmedPhone;
    }

    // 4. Validate bio (if provided)
    if (bio !== undefined) {
      if (typeof bio !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid bio. Bio must be a string.',
        });
      }
      const trimmedBio = bio.trim();
      if (trimmedBio.length > 1000) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 1000 characters.',
        });
      }
      updateFields.bio = trimmedBio;
    }

    // 5. Validate image (if provided)
    if (image !== undefined) {
      if (typeof image !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid image. Image must be a string URL or data URI.',
        });
      }
      const trimmedImage = image.trim();
      if (trimmedImage.length > 500000) {
        return res.status(400).json({
          success: false,
          message: 'Image string is too large.',
        });
      }
      updateFields.image = trimmedImage;
    }

    // Require at least one valid field to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid profile fields provided for update. Allowed fields: name, phone, bio, image.',
      });
    }

    // Attach updated timestamp
    const updatedAt = new Date();
    updateFields.updatedAt = updatedAt;

    // Execute update strictly for this authenticated user
    await db.collection('users').updateOne(
      { _id: existingUser._id },
      { $set: updateFields }
    );

    // Retrieve updated document
    const updatedUser = await db.collection('users').findOne(
      { _id: existingUser._id },
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          plan: 1,
          image: 1,
          phone: 1,
          bio: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    const safeUser = {
      _id: updatedUser._id,
      name: updatedUser.name || 'User',
      email: updatedUser.email || '',
      role: updatedUser.role || 'student',
      plan: updatedUser.plan || 'free',
      image: updatedUser.image || '',
      phone: updatedUser.phone || '',
      bio: updatedUser.bio || '',
      createdAt: updatedUser.createdAt || null,
      updatedAt: updatedUser.updatedAt || null,
    };

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: safeUser,
      data: safeUser,
    });
  } catch (error) {
    console.error('Error updating user profile:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user profile.',
    });
  }
}

/**
 * 3. GET /api/admin/users (Protected: verifyToken, verifyAdmin)
 * Retrieves all registered users from the users collection.
 * Projects safe profile fields: _id, name, email, role, plan, image, phone, bio, createdAt.
 * Sorts newest users first.
 * Never exposes passwords, tokens, sessions, or authentication secrets.
 */
export async function getAdminUsers(req, res) {
  try {
    const db = getDB();

    const users = await db
      .collection('users')
      .find({})
      .project({
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        plan: 1,
        image: 1,
        phone: 1,
        bio: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ createdAt: -1, _id: -1 })
      .toArray();

    const safeUsers = users.map((u) => ({
      _id: u._id,
      name: u.name || 'User',
      email: u.email || '',
      role: u.role || 'student',
      plan: u.plan || 'free',
      image: u.image || '',
      phone: u.phone || '',
      bio: u.bio || '',
      createdAt: u.createdAt || null,
      updatedAt: u.updatedAt || null,
    }));

    return res.status(200).json({
      success: true,
      count: safeUsers.length,
      users: safeUsers,
      data: safeUsers,
    });
  } catch (error) {
    console.error('Error fetching admin users:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users list.',
    });
  }
}

/**
 * 2. PATCH /api/admin/users/:id/role (Protected: verifyToken, verifyAdmin)
 * Updates a user's role to 'student', 'tutor', or 'admin'.
 * Validates role input strictly.
 * Validates user ID using ObjectId with safe string fallback.
 * Prevents an admin from demoting their own account.
 * Updates only the role field and updates updatedAt timestamp.
 * Never allows client modifications to email, plan, password, etc.
 */
export async function updateUserRoleAdmin(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    // 1. Validate role input
    if (!role || typeof role !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Role is required and must be a string.',
      });
    }

    const normalizedRole = role.trim().toLowerCase();
    if (!ALLOWED_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role: "${role}". Role must be one of: ${ALLOWED_ROLES.join(', ')}.`,
      });
    }

    // 2. Validate user ID format (Better Auth MongoDB adapter uses 24-character hex ObjectId)
    if (!id || typeof id !== 'string' || !ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format. Must be a valid 24-character hexadecimal ObjectId.',
      });
    }

    const db = getDB();

    // 3. Find target user in users collection
    const targetUser = await db.collection('users').findOne({
      $or: [
        { _id: new ObjectId(id) },
        { _id: id },
      ],
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database.',
      });
    }

    // 4. Guard: Prevent an admin from demoting their own account
    const requesterId = String(req.user?.userId || '');
    const requesterEmail = String(req.user?.email || '').toLowerCase();
    const isSelf =
      String(targetUser._id) === requesterId ||
      String(targetUser.email || '').toLowerCase() === requesterEmail;

    if (isSelf && normalizedRole !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admins cannot demote their own account.',
      });
    }

    // 5. Update only the target user's role and updatedAt
    const updatedAt = new Date();
    await db.collection('users').updateOne(
      { _id: targetUser._id },
      {
        $set: {
          role: normalizedRole,
          updatedAt,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `User role successfully updated to ${normalizedRole}.`,
      user: {
        _id: targetUser._id,
        name: targetUser.name || 'User',
        email: targetUser.email || '',
        role: normalizedRole,
        plan: targetUser.plan || 'free',
        image: targetUser.image || '',
        phone: targetUser.phone || '',
        bio: targetUser.bio || '',
        createdAt: targetUser.createdAt || null,
        updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating user role:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
    });
  }
}

/**
 * 3. GET /api/admin/stats (Protected: verifyToken, verifyAdmin)
 * Retrieves platform overview statistics for the Admin Dashboard:
 * - Total Users (count of all users in users collection)
 * - Total Tutors (count of users with role: 'tutor')
 * - Pending Tuitions (count of tuitions with approvalStatus: 'pending')
 * - Approved Tuitions (count of tuitions with approvalStatus: 'approved')
 * - Total Stripe Revenue (sum of amount from payments collection where paymentStatus: 'paid')
 * Empty collections return 0 values, never errors.
 * No private user, student, tutor, or payment details are exposed.
 */
export async function getAdminDashboardStats(req, res) {
  try {
    const db = getDB();

    const [
      totalUsers,
      totalTutors,
      pendingTuitions,
      approvedTuitions,
      revenueAggregation,
    ] = await Promise.all([
      db.collection('users').countDocuments({}),
      db.collection('users').countDocuments({ role: 'tutor' }),
      db.collection('tuitions').countDocuments({ approvalStatus: 'pending' }),
      db.collection('tuitions').countDocuments({ approvalStatus: 'approved' }),
      db
        .collection('payments')
        .aggregate([
          {
            $match: {
              paymentStatus: 'paid',
            },
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$amount' },
              totalRevenueCents: { $sum: '$amountCents' },
              successfulTransactionsCount: { $sum: 1 },
            },
          },
        ])
        .toArray(),
    ]);

    const revenueStats = revenueAggregation[0] || {
      totalRevenue: 0,
      totalRevenueCents: 0,
      successfulTransactionsCount: 0,
    };

    const totalStripeRevenue = revenueStats.totalRevenue;

    const statsData = {
      totalUsers,
      totalTutors,
      pendingTuitions,
      approvedTuitions,
      totalStripeRevenue,
    };

    return res.status(200).json({
      success: true,
      data: statsData,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin dashboard statistics.',
    });
  }
}

