import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.error('Stripe publishable key is missing. Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env file');
}

const stripePromise = loadStripe(stripePublishableKey);

export default stripePromise;