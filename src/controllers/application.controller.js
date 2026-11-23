import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';

/**
 * 1. POST /api/applications (Student Only)
 * Submits an application for an approved & active tuition post.
 * Prevents duplicate applications by the same student.
 * Derives student and tuition data securely from DB and session.
 */
export async function createApplication(req, res) {
  try {
    const db = getDB();
    const { tuitionId, studentPhone, preferredSchedule, studentNote } = req.body;

    if (!tuitionId) {
      return res.status(400).json({
        success: false,
        message: 'tuitionId is required.',
      });
    }

    if (!ObjectId.isValid(tuitionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID format.',
      });
    }

    if (!studentPhone || typeof studentPhone !== 'string' || !studentPhone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'studentPhone is required for contact purposes.',
      });
    }

    // 1. Verify tuition exists, is approved, and is active
    const tuition = await db.collection('tuitions').findOne({ _id: new ObjectId(tuitionId) });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: 'Tuition post not found.',
      });
    }

    if (tuition.approvalStatus !== 'approved' || tuition.isActive !== true) {
      return res.status(400).json({
        success: false,
        message: 'Cannot apply to a tuition post that is unapproved or inactive.',
      });
    }

    // 2. Prevent duplicate application by the same student
    const existingApp = await db.collection('applications').findOne({
      tuitionId: new ObjectId(tuitionId),
      studentEmail: req.user.email,
    });

    if (existingApp) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an application for this tuition post.',
      });
    }

    // 3. Construct application document with exact 12 PDF-required fields
    const newApplication = {
      tuitionId: new ObjectId(tuitionId),
      tuitionTitle: tuition.title,
      subject: tuition.subject,
      monthlyFee: tuition.monthlyFee,
      tutorEmail: tuition.tutorEmail,
      studentName: req.user.name || 'Student',
      studentEmail: req.user.email,
      studentPhone: studentPhone.trim(),
      preferredSchedule: preferredSchedule && typeof preferredSchedule === 'string' ? preferredSchedule.trim() : 'Flexible',
      studentNote: studentNote && typeof studentNote === 'string' ? studentNote.trim() : '',
      status: 'pending',
      appliedAt: new Date(),
    };

    const result = await db.collection('applications').insertOne(newApplication);

    return res.status(201).json({
      success: true,
      message: 'Application submitted successfully.',
      application: {
        _id: result.insertedId,
        ...newApplication,
      },
    });
  } catch (error) {
    // Handle concurrent duplicate insertion attempts caught by unique index
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted an application for this tuition post.',
      });
    }

    console.error('Error submitting application:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit tuition application.',
    });
  }
}

/**
 * 2. GET /api/my-applications (Student Only)
 * Returns all applications submitted by the logged-in student.
 */
export async function getMyApplications(req, res) {
  try {
    const db = getDB();
    const query = { studentEmail: req.user.email };

    const applications = await db
      .collection('applications')
      .find(query)
      .sort({ appliedAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error('Error fetching student applications:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve your applications.',
    });
  }
}

/**
 * 2b. GET /api/student/stats (Student Only)
 * Retrieves dashboard overview statistics for the authenticated student:
 * - totalAppliedTuitions: Total applications submitted by the student
 * - acceptedApplications: Applications with status 'accepted'
 * - pendingApplications: Applications with status 'pending'
 * - currentPlan: The student's current plan ('free' or 'pro') from users collection
 * Derives student identity strictly from verified JWT (req.user.email).
 */
export async function getStudentDashboardStats(req, res) {
  try {
    const db = getDB();
    const studentEmail = req.user?.email;

    if (!studentEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Student email not found in token payload.',
      });
    }

    const [
      userDoc,
      totalAppliedTuitions,
      acceptedApplications,
      pendingApplications,
    ] = await Promise.all([
      db.collection('users').findOne(
        { email: studentEmail },
        { projection: { plan: 1 } }
      ),
      db.collection('applications').countDocuments({ studentEmail }),
      db.collection('applications').countDocuments({ studentEmail, status: 'accepted' }),
      db.collection('applications').countDocuments({ studentEmail, status: 'pending' }),
    ]);

    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found in database.',
      });
    }

    const currentPlan =
      userDoc.plan && typeof userDoc.plan === 'string' && userDoc.plan.trim()
        ? userDoc.plan.trim().toLowerCase()
        : 'free';

    return res.status(200).json({
      success: true,
      data: {
        totalAppliedTuitions,
        acceptedApplications,
        pendingApplications,
        currentPlan,
      },
    });
  } catch (error) {
    console.error('Error fetching student dashboard stats:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve student dashboard statistics.',
    });
  }
}

/**
 * 2c. GET /api/tutor/stats (Tutor Only)
 * Retrieves dashboard overview statistics for the authenticated tutor:
 * - totalTuitionsPosted: Count all tuitions posted by tutor using tutorEmail
 * - activeApprovedTuitions: Count tuitions where approvalStatus: 'approved' and isActive: true
 * - totalApplicantsReceived: Count all applications received across all statuses using tutorEmail
 * - currentPlan: The tutor's current plan ('free' or 'pro') from users collection
 * Derives tutor identity strictly from verified JWT (req.user.email).
 */
export async function getTutorDashboardStats(req, res) {
  try {
    const db = getDB();
    const tutorEmail = req.user?.email;

    if (!tutorEmail) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Tutor email not found in token payload.',
      });
    }

    const [
      userDoc,
      totalTuitionsPosted,
      activeApprovedTuitions,
      totalApplicantsReceived,
    ] = await Promise.all([
      db.collection('users').findOne(
        { email: tutorEmail },
        { projection: { plan: 1 } }
      ),
      db.collection('tuitions').countDocuments({ tutorEmail }),
      db.collection('tuitions').countDocuments({
        tutorEmail,
        approvalStatus: 'approved',
        isActive: true,
      }),
      db.collection('applications').countDocuments({ tutorEmail }),
    ]);

    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: 'Tutor record not found in database.',
      });
    }

    const currentPlan =
      userDoc.plan && typeof userDoc.plan === 'string' && userDoc.plan.trim()
        ? userDoc.plan.trim().toLowerCase()
        : 'free';

    return res.status(200).json({
      success: true,
      data: {
        totalTuitionsPosted,
        activeApprovedTuitions,
        totalApplicantsReceived,
        currentPlan,
      },
    });
  } catch (error) {
    console.error('Error fetching tutor dashboard stats:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tutor dashboard statistics.',
    });
  }
}

/**
 * 3. DELETE /api/applications/:id (Student Only)
 * Allows a student to cancel/delete their own application ONLY while status is 'pending'.
 */
export async function cancelApplication(req, res) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format.',
      });
    }

    const db = getDB();
    const application = await db.collection('applications').findOne({ _id: new ObjectId(id) });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    // Verify student ownership
    const isOwner = application.studentEmail === req.user.email;

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only cancel your own applications.',
      });
    }

    // PDF Rule: Cancel/delete an application only while its status is pending
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel an application that has already been ${application.status}.`,
      });
    }

    await db.collection('applications').deleteOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      success: true,
      message: 'Application cancelled successfully.',
    });
  } catch (error) {
    console.error('Error cancelling application:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel application.',
    });
  }
}

/**
 * 4. GET /api/tutor/applications (Tutor Only)
 * Returns all applications submitted to the logged-in tutor's tuition posts.
 */
export async function getTutorApplications(req, res) {
  try {
    const db = getDB();
    const query = { tutorEmail: req.user.email };

    if (req.query.tuitionId && ObjectId.isValid(req.query.tuitionId)) {
      query.tuitionId = new ObjectId(req.query.tuitionId);
    }

    const applications = await db
      .collection('applications')
      .find(query)
      .sort({ appliedAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error('Error fetching tutor applications:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve applicants.',
    });
  }
}

/**
 * 5. GET /api/tuitions/:tuitionId/applications (Tutor Only)
 * Returns all applications submitted to a specific tuition post owned by the tutor.
 */
export async function getApplicationsForTuition(req, res) {
  try {
    const { tuitionId } = req.params;

    if (!ObjectId.isValid(tuitionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tuition ID format.',
      });
    }

    const db = getDB();
    const tuition = await db.collection('tuitions').findOne({ _id: new ObjectId(tuitionId) });

    if (!tuition) {
      return res.status(404).json({
        success: false,
        message: 'Tuition post not found.',
      });
    }

    // Verify tutor ownership of this tuition post
    const isOwner =
      tuition.tutorEmail === req.user.email ||
      String(tuition.tutorId) === String(req.user.userId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not own this tuition post.',
      });
    }

    const applications = await db
      .collection('applications')
      .find({ tuitionId: new ObjectId(tuitionId) })
      .sort({ appliedAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    console.error('Error fetching applicants for tuition:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve tuition applicants.',
    });
  }
}

/**
 * 6. PATCH /api/applications/:id/status (Tutor Only)
 * Allows tutor to accept or reject an application for their own tuition post.
 * Prevents changing already processed applications.
 */
export async function updateApplicationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const normalizedStatus = (status || '').toLowerCase();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid application ID format.',
      });
    }

    if (!['accepted', 'rejected'].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'accepted' or 'rejected'.",
      });
    }

    const db = getDB();
    const application = await db.collection('applications').findOne({ _id: new ObjectId(id) });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found.',
      });
    }

    // Verify that the logged-in tutor owns the tuition of this application
    if (application.tutorEmail !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only review applications submitted to your own tuition posts.',
      });
    }

    // PDF Rule: Do not allow changing an already processed application
    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Application has already been processed as '${application.status}' and cannot be modified.`,
      });
    }

    await db.collection('applications').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: normalizedStatus,
        },
      }
    );

    const updated = await db.collection('applications').findOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      success: true,
      message: `Application has been ${normalizedStatus}.`,
      application: updated,
    });
  } catch (error) {
    console.error('Error updating application status:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update application status.',
    });
  }
}

