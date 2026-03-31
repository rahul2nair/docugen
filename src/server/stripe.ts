import Stripe from "stripe";
import { config } from "@/server/config";

let stripeClient: Stripe | null = null;

export function isStripeConfigured() {
  return Boolean(config.stripe.secretKey && (config.stripe.prices.proMonthly || config.stripe.prices.proYearly));
}

export function getStripe() {
  if (!config.stripe.secretKey) {
    throw new Error("Stripe is not configured");
  }

  stripeClient ??= new Stripe(config.stripe.secretKey, {
    apiVersion: "2026-03-25.dahlia"
  });

  return stripeClient;
}

export function getStripePlanOptions() {
  return [
    config.stripe.prices.proMonthly
      ? {
          id: "pro-monthly",
          priceId: config.stripe.prices.proMonthly,
          title: "Pro monthly",
          cadenceLabel: "Monthly"
        }
      : null,
    config.stripe.prices.proYearly
      ? {
          id: "pro-yearly",
          priceId: config.stripe.prices.proYearly,
          title: "Pro yearly",
          cadenceLabel: "Yearly"
        }
      : null
  ].filter(Boolean) as Array<{
    id: string;
    priceId: string;
    title: string;
    cadenceLabel: string;
  }>;
}

export function isKnownStripePrice(priceId: string) {
  return getStripePlanOptions().some((plan) => plan.priceId === priceId);
}

export function mapStripeSubscription(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const product = item?.price?.product;
  const subscriptionWithPeriod = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
  };

  return {
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || null,
    stripeSubscriptionId: subscription.id,
    stripePriceId: item?.price?.id || null,
    stripeProductId: typeof product === "string" ? product : product?.id || null,
    subscriptionStatus: subscription.status,
    planInterval: item?.price?.recurring?.interval || null,
    currentPeriodEnd: subscriptionWithPeriod.current_period_end ? new Date(subscriptionWithPeriod.current_period_end * 1000).toISOString() : null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  };
}