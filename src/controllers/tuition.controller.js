import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

// Default banner image if client does not provide one
const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=60';

/**
 * 1. GET /api/tuitions (Public)
 * Returns only approved and active tuitions.
 * Supports search by title/subject and filtering by subject, classLevel, mode.
 */
export async function getPublicTuitions(req, res) {
  try {
    const db = getDB();
    const { search, subject, classLevel, mode } = req.query;

    const query = {
      approvalStatus: 'approved',
      isActive: true,
    };

    // Server-side search by title or subject
    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { subject: { $regex: term, $options: 'i' } },
      ];
    }

    // Exact or case-insensitive filter by subject
    if (subject && typeof subject === 'string' && subject.trim()) {
      query.subject = { $regex: `^${subject.trim()}$`, $options: 'i' };
    }

    // Filter by classLevel
    if (classLevel && typeof classLevel === 'string' && classLevel.trim()) {
      query.classLevel = { $regex: `^${classLevel.trim()}$`, $options: 'i' };
    }

    // Filter by mode (e.g. online, in-person, hybrid)
    if (mode && typeof mode === 'string' && mode.trim()) {
      query.mode = { $regex: `^${mode.trim()}$`, $options: 'i' };
    }

    const tuitions = await db
      .collection('tuitions')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: tuitions.length,
      tuitions,
    });
  } catch (error) {
    console.error('Error fetching public tuitions:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tuitions.',
    });
  }
}

/**
 * 2. GET /api/tuitions/:id (Public)
 * Returns a single tuition details only if it is approved and active.
 */
export async function getTuitionById(req, res) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID format.',
      });
    }

    const db = getDB();
    const tuition = await db.collection('tuitions').findOne({ _id: new ObjectId(id) });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: 'Tuition not found.',
      });
    }

    // Public cannot view pending, rejected, or inactive tuitions
    if (tuition.approvalStatus !== 'approved' || tuition.isActive !== true) {
      return res.status(404).json({
        success: false,
        message: 'Tuition not found or is currently inactive.',
      });
    }

    return res.status(200).json({
      success: true,
      tuition,
    });
  } catch (error) {
    console.error('Error fetching tuition details:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tuition details.',
    });
  }
}

/**
 * 3. POST /api/tuitions (Tutor Only)
 * Creates a new tuition post with approvalStatus: 'pending' and isActive: true.
 * Derives tutor identity from req.user (zero-trust).
 * Enforces plan limits: Free tier = max 2 posts; Pro tier = unlimited.
 */
export async function createTuition(req, res) {
  try {
    const db = getDB();
    const {
      title,
      subject,
      classLevel,
      mode,
      location,
      monthlyFee,
      daysPerWeek,
      bannerImage,
      description,
    } = req.body;

    // Validate required text fields
    if (!title || !subject || !classLevel || !mode || !location || !description) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, subject, classLevel, mode, location, and description are required.',
      });
    }

    // Validate numeric values
    const feeNum = Number(monthlyFee);
    const daysNum = Number(daysPerWeek);

    if (isNaN(feeNum) || feeNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'monthlyFee must be a valid positive number.',
      });
    }

    if (isNaN(daysNum) || daysNum < 1 || daysNum > 7) {
      return res.status(400).json({
        success: false,
        message: 'daysPerWeek must be a number between 1 and 7.',
      });
    }

    // Check tutor's subscription plan from users collection
    let tutorUser = null;
    if (ObjectId.isValid(req.user.userId)) {
      tutorUser = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });
    }
    if (!tutorUser && req.user.email) {
      tutorUser = await db.collection('users').findOne({ email: req.user.email });
    }

    const tutorPlan = tutorUser?.plan ? tutorUser.plan.toLowerCase() : 'free';

    // Free tier limitation: maximum 2 tuition posts
    if (tutorPlan !== 'pro') {
      const existingCount = await db.collection('tuitions').countDocuments({
        $or: [
          { tutorEmail: req.user.email },
          { tutorId: req.user.userId },
        ],
      });

      if (existingCount >= 2) {
        return res.status(403).json({
          success: false,
          message: 'Free tier limit reached. Free tutors can create at most 2 tuition posts. Please upgrade to Pro for unlimited postings.',
        });
      }
    }

    // Construct new tuition document with zero-trust verified tutor data
    const newTuition = {
      title: title.trim(),
      subject: subject.trim(),
      classLevel: classLevel.trim(),
      mode: mode.trim(),
      location: location.trim(),
      monthlyFee: feeNum,
      daysPerWeek: daysNum,
      bannerImage: bannerImage && bannerImage.trim() ? bannerImage.trim() : DEFAULT_BANNER,
      description: description.trim(),
      tutorId: req.user.userId,
      tutorName: req.user.name || tutorUser?.name || 'Anonymous Tutor',
      tutorEmail: req.user.email,
      approvalStatus: 'pending',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await db.collection('tuitions').insertOne(newTuition);

    return res.status(201).json({
      success: true,
      message: 'Tuition post created successfully and is pending admin approval.',
      tuition: {
        _id: insertResult.insertedId,
        ...newTuition,
      },
    });
  } catch (error) {
    console.error('Error creating tuition post:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create tuition post.',
    });
  }
}

/**
 * 4. GET /api/my-tuitions (Tutor Only)
 * Returns all tuition posts created by the currently logged-in tutor.
 */
export async function getMyTuitions(req, res) {
  try {
    const db = getDB();
    const query = {
      $or: [
        { tutorEmail: req.user.email },
        { tutorId: req.user.userId },
      ],
    };

    const tuitions = await db
      .collection('tuitions')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: tuitions.length,
      tuitions,
    });
  } catch (error) {
    console.error('Error fetching tutor tuitions:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your tuition posts.',
    });
  }
}

/**
 * 5. PATCH /api/tuitions/:id (Tutor Only)
 * Allows tutor to update only their own post.
 * Ownership and approvalStatus cannot be changed.
 */
export async function updateTuition(req, res) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID format.',
      });
    }

    const db = getDB();
    const existing = await db.collection('tuitions').findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Tuition post not found.',
      });
    }

    // Verify ownership
    const isOwner =
      existing.tutorEmail === req.user.email ||
      String(existing.tutorId) === String(req.user.userId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only edit your own tuition posts.',
      });
    }

    // Whitelist editable fields (ownership and approvalStatus are strictly forbidden)
    const updateData = {};
    const allowedFields = [
      'title',
      'subject',
      'classLevel',
      'mode',
      'location',
      'bannerImage',
      'description',
      'isActive',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = typeof req.body[field] === 'string' ? req.body[field].trim() : req.body[field];
      }
    }

    if (req.body.monthlyFee !== undefined) {
      const fee = Number(req.body.monthlyFee);
      if (isNaN(fee) || fee <= 0) {
        return res.status(400).json({
          success: false,
          message: 'monthlyFee must be a valid positive number.',
        });
      }
      updateData.monthlyFee = fee;
    }

    if (req.body.daysPerWeek !== undefined) {
      const days = Number(req.body.daysPerWeek);
      if (isNaN(days) || days < 1 || days > 7) {
        return res.status(400).json({
          success: false,
          message: 'daysPerWeek must be a number between 1 and 7.',
        });
      }
      updateData.daysPerWeek = days;
    }

    updateData.updatedAt = new Date();

    await db.collection('tuitions').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updated = await db.collection('tuitions').findOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      success: true,
      message: 'Tuition post updated successfully.',
      tuition: updated,
    });
  } catch (error) {
    console.error('Error updating tuition post:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tuition post.',
    });
  }
}

/**
 * 6. DELETE /api/tuitions/:id (Tutor Only)
 * Allows tutor to delete only their own post.
 */
export async function deleteTuition(req, res) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID format.',
      });
    }

    const db = getDB();
    const existing = await db.collection('tuitions').findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Tuition post not found.',
      });
    }

    // Verify ownership
    const isOwner =
      existing.tutorEmail === req.user.email ||
      String(existing.tutorId) === String(req.user.userId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only delete your own tuition posts.',
      });
    }

    await db.collection('tuitions').deleteOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      success: true,
      message: 'Tuition post deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting tuition post:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete tuition post.',
    });
  }
}

/**
 * 7. GET /api/admin/tuitions (Admin Only)
 * Lists all tuition posts (all approval statuses and active states).
 */
export async function getAllTuitionsAdmin(req, res) {
  try {
    const db = getDB();
    const tuitions = await db
      .collection('tuitions')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: tuitions.length,
      tuitions,
    });
  } catch (error) {
    console.error('Error fetching admin tuitions:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin tuitions.',
    });
  }
}

/**
 * 8. PATCH /api/admin/tuitions/:id/status (Admin Only)
 * Approves or rejects a tuition post.
 */
export async function updateTuitionStatusAdmin(req, res) {
  try {
    const { id } = req.params;
    const { status, approvalStatus } = req.body;
    const newStatus = (status || approvalStatus || '').toLowerCase();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID format.',
      });
    }

    if (!['approved', 'rejected', 'pending'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'approved', 'rejected', or 'pending'.",
      });
    }

    const db = getDB();
    const existing = await db.collection('tuitions').findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Tuition post not found.',
      });
    }

    await db.collection('tuitions').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          approvalStatus: newStatus,
          updatedAt: new Date(),
        },
      }
    );

    const updated = await db.collection('tuitions').findOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      success: true,
      message: `Tuition status updated to '${newStatus}'.`,
      tuition: updated,
    });
  } catch (error) {
    console.error('Error updating tuition approval status:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update tuition approval status.',
    });
  }
}

