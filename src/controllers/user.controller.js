import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

const ALLOWED_ROLES = ['student', 'tutor', 'admin'];

/**
 * 1. GET /api/admin/users (Protected: verifyToken, verifyAdmin)
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

