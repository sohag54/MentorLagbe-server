import Stripe from 'stripe';

let stripeInstance = null;

/**
 * Returns a configured Stripe SDK instance or null if secret key is missing.
 */
export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  if (!stripeInstance) {
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

