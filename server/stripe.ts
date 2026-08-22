import Stripe from "stripe";

let stripeClient: Stripe | undefined;

export function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) return undefined;
  stripeClient ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

