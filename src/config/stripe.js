import { loadStripe } from '@stripe/stripe-js';
import { getStripeConfig } from '../services/paiements';

const ENV_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

// Si la clé est dans l'env, on charge Stripe immédiatement
// Sinon on la récupère depuis GET /paiements/config
export const stripePromise = (ENV_KEY && ENV_KEY.startsWith('pk_'))
  ? loadStripe(ENV_KEY)
  : getStripeConfig()
      .then((cfg) => {
        const key = cfg?.publishableKey || cfg?.publishable_key || '';
        return (key && key.startsWith('pk_')) ? loadStripe(key) : null;
      })
      .catch(() => null);
