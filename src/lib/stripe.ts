import { Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!key) {
    throw new Error('Stripe publishable key is not set in environment variables');
  }

  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }

  return stripePromise;
};
