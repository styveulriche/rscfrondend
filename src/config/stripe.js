import { loadStripe } from '@stripe/stripe-js';

const STRIPE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

// Ne charge Stripe que si une vraie clé publiable est configurée
export const stripePromise =
  STRIPE_KEY && STRIPE_KEY.startsWith('pk_')
    ? loadStripe(STRIPE_KEY)
    : null;
