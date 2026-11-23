import { ObjectId } from 'mongodb';
import { getDB } from '../config/db.js';
import { getStripe } from '../config/stripe.js';

// Tier pricing in USD cents as mandated by Assignment 9 Category 001 PDF
// Tutor Pro Plan: $15 -> 1500 cents
// Student Pro Plan: $10 -> 1000 cents
// Recurring interval: monthly (subscription mode)
const PLAN_PRICING = {
  student: {
    amountCents: 1000,
    amountDollars: 10,
    name: 'Student Pro Subscription',
    description: 'Pro Plan for Students: Unlimited tuition bookmarks and priority booking.',
  },
  tutor: {
    amountCents: 1500,
    amountDollars: 15,
    name: 'Tutor Pro Subscription',
    description: 'Pro Plan for Tutors: Unlimited tuition postings and verified badge.',
  },
};

/**
 * 1. POST /api/payment/create-checkout-session (Protected: verifyToken)
 * Creates a Stripe Checkout Session in subscription mode.
 * Enforces server-side pricing: Student ($10/mo), Tutor ($15/mo).
 * Admin and unknown roles are rejected.
 */
export async function createCheckoutSession(req, res) {
  try {
    const role = (req.user?.role || '').toLowerCase();

    // 1. Only student and tutor roles are allowed to subscribe to Pro
    if (!['student', 'tutor'].includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only students and tutors can subscribe to the Pro Plan.',
      });
    }

    const stripe = getStripe();
    if (!stripe) {
      return res.status(500).json({
        success: false,
        message: 'Stripe payment gateway is not configured.',
      });
    }

    const db = getDB();

    // 2. Validate user identity and ensure user exists in database
    let dbUser = null;
    if (ObjectId.isValid(req.user.userId)) {
      dbUser = await db.collection('users').findOne({ _id: new ObjectId(req.user.userId) });
    }
    if (!dbUser && req.user.email) {
      dbUser = await db.collection('users').findOne({ email: req.user.email });
    }

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found in database.',
      });
    }

    // 3. Prevent duplicate active subscription if user already has Pro plan
    if (dbUser.plan === 'pro') {
      return res.status(400).json({
        success: false,
        message: 'User is already subscribed to the Pro Plan.',
      });
    }

    const planConfig = PLAN_PRICING[role];
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

    // 4. Set safe metadata for checkout and webhook reconciliation
    const metadata = {
      userId: String(dbUser._id),
      userEmail: dbUser.email,
      userName: dbUser.name || req.user.name || 'User',
      userRole: role,
      planName: 'pro',
    };

    // 5. Create Stripe Checkout Session (Subscription Mode)
    // Server determines unit_amount and recurring interval. Client parameters are ignored.
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: dbUser.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: planConfig.name,
              description: planConfig.description,
            },
            unit_amount: planConfig.amountCents,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      metadata,
      subscription_data: {
        metadata,
      },
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,
    });

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate payment checkout session.',
    });
  }
}

/**
 * 2. POST /api/webhooks/stripe (Public webhook with raw buffer signature verification)
 * Processes Stripe subscription checkout events, upgrades user to Pro, and inserts payment record.
 * Idempotent: repeated event deliveries do not duplicate payments or side effects.
 */
export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook configuration error: STRIPE_WEBHOOK_SECRET is missing.');
    return res.status(500).json({
      success: false,
      message: 'Webhook signing secret is not configured.',
    });
  }

  const stripe = getStripe();
  if (!stripe) {
    return res.status(500).json({
      success: false,
      message: 'Stripe service is not configured.',
    });
  }

  let event = null;

  try {
    // Verify cryptographic signature with the raw request body Buffer
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({
      success: false,
      message: `Webhook signature verification failed: ${err.message}`,
    });
  }

  try {
    const db = getDB();

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Verify payment was actually collected (paid)
      if (session.payment_status !== 'paid') {
        console.warn(`Stripe session ${session.id} completed with non-paid status: ${session.payment_status}`);
        return res.status(200).json({
          received: true,
          status: session.payment_status,
          message: 'Payment not completed; user not upgraded.',
        });
      }

      const { userId, userEmail, userName, userRole, planName } = session.metadata || {};

      // Retrieve user from database using verified metadata
      const userQuery = [];
      if (userId && ObjectId.isValid(userId)) {
        userQuery.push({ _id: new ObjectId(userId) });
      }
      if (userEmail) {
        userQuery.push({ email: userEmail });
      }

      const dbUser = userQuery.length > 0 ? await db.collection('users').findOne({ $or: userQuery }) : null;

      if (!dbUser) {
        console.error('Stripe webhook: No matching user found for session:', session.id, userEmail);
        return res.status(200).json({ received: true, warning: 'User not found' });
      }

      // Check idempotency: avoid duplicate payment insertion if event was already processed
      const existingPayment = await db.collection('payments').findOne({
        $or: [
          { stripeEventId: event.id },
          { stripeSessionId: session.id },
        ],
      });

      if (existingPayment) {
        return res.status(200).json({
          received: true,
          message: 'Event already processed.',
        });
      }

      // 1. Upgrade user's subscription plan to 'pro' in users collection
      await db.collection('users').updateOne(
        { _id: dbUser._id },
        {
          $set: {
            plan: 'pro',
            updatedAt: new Date(),
          },
        }
      );

      // 2. Resolve accurate financial transaction reference
      // Priority: session.payment_intent -> invoice.payment_intent -> invoice ID -> session ID fallback
      // Never use subscription ID as a transaction ID.
      let transactionId = null;
      let resolvedInvoiceId = null;

      if (session.payment_intent) {
        transactionId = typeof session.payment_intent === 'object'
          ? session.payment_intent.id
          : String(session.payment_intent);
      }

      if (!transactionId && session.invoice) {
        if (typeof session.invoice === 'object' && session.invoice !== null) {
          resolvedInvoiceId = session.invoice.id;
          if (session.invoice.payment_intent) {
            transactionId = typeof session.invoice.payment_intent === 'object'
              ? session.invoice.payment_intent.id
              : String(session.invoice.payment_intent);
          }
        } else if (typeof session.invoice === 'string') {
          resolvedInvoiceId = session.invoice;
        }

        // Attempt safe invoice retrieval if PaymentIntent was not directly embedded
        if (!transactionId && resolvedInvoiceId && stripe && stripe.invoices) {
          try {
            const retrievedInvoice = await stripe.invoices.retrieve(resolvedInvoiceId);
            if (retrievedInvoice && retrievedInvoice.payment_intent) {
              transactionId = typeof retrievedInvoice.payment_intent === 'object'
                ? retrievedInvoice.payment_intent.id
                : String(retrievedInvoice.payment_intent);
            }
          } catch (invoiceErr) {
            console.warn('Optional invoice PaymentIntent lookup skipped:', invoiceErr.message);
          }
        }

        // Truthful fallback: invoice ID represents the billing statement transaction
        if (!transactionId && resolvedInvoiceId) {
          transactionId = String(resolvedInvoiceId);
        }
      }

      // Final truthful fallback: Checkout Session ID
      if (!transactionId) {
        transactionId = String(session.id);
      }

      // 3. Insert transaction record in payments collection
      // Matches fields required by PDF Admin Transactions table:
      // userName, userEmail, userRole, role, planName, amount, currency, transactionId, paidAt, paymentStatus
      const amountDollars = session.amount_total
        ? session.amount_total / 100
        : dbUser.role === 'tutor'
        ? 15
        : 10;

      const paymentRecord = {
        userId: String(dbUser._id),
        userEmail: dbUser.email,
        userName: dbUser.name || userName || 'User',
        userRole: dbUser.role || userRole || 'student',
        role: dbUser.role || userRole || 'student',
        planName: planName || 'pro',
        amount: amountDollars,
        amountCents: session.amount_total || (dbUser.role === 'tutor' ? 1500 : 1000),
        currency: (session.currency || 'usd').toLowerCase(),
        transactionId: transactionId,
        invoiceId: resolvedInvoiceId || '',
        stripeSessionId: session.id,
        checkoutSessionId: session.id,
        subscriptionId: String(session.subscription || ''),
        stripeEventId: event.id,
        paymentStatus: 'paid',
        paidAt: new Date(),
      };

      try {
        await db.collection('payments').insertOne(paymentRecord);
      } catch (insertError) {
        // Handle E11000 duplicate key error from unique index under concurrent delivery
        if (insertError.code === 11000) {
          return res.status(200).json({
            received: true,
            duplicate: true,
            message: 'Duplicate event delivery caught by index.',
          });
        }
        throw insertError;
      }

      console.log(`Successfully upgraded user ${dbUser.email} to Pro via Stripe session ${session.id}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling Stripe webhook event:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to process webhook event.',
    });
  }
}

