import Stripe from "stripe";

let _stripe: Stripe | null = null;

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    if (!_stripe) {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2026-01-28.clover",
        typescript: true,
      });
    }
    return Reflect.get(_stripe, prop, receiver);
  },
});
