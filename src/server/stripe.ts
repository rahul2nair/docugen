import Stripe from "stripe";
import { config } from "@/server/config";

let stripeClient: Stripe | null = null;

export interface StripePlanOption {
  id: string;
  priceId: string;
  title: string;
  cadenceLabel: string;
  amountLabel: string;
  helperLabel: string;
}

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

function formatStripeAmount(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount == null || !currency) {
    return null;
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2
  }).format(amount);
}

async function buildPlanOption(
  id: string,
  priceId: string,
  fallbackTitle: string,
  fallbackCadence: string
): Promise<StripePlanOption> {
  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const interval = price.recurring?.interval === "year" ? "Yearly" : "Monthly";
    const formattedAmount = formatStripeAmount(
      typeof price.unit_amount === "number" ? price.unit_amount / 100 : null,
      price.currency
    );

    return {
      id,
      priceId,
      title: interval === "Yearly" ? "Pro yearly" : "Pro monthly",
      cadenceLabel: interval,
      amountLabel: formattedAmount ? `${formattedAmount} / ${interval === "Yearly" ? "year" : "month"}` : fallbackCadence,
      helperLabel: `${interval} billing through Stripe Checkout`
    };
  } catch {
    return {
      id,
      priceId,
      title: fallbackTitle,
      cadenceLabel: fallbackCadence,
      amountLabel: fallbackCadence,
      helperLabel: `${fallbackCadence} billing through Stripe Checkout`
    };
  }
}

export async function getStripePlanOptions(): Promise<StripePlanOption[]> {
  const plans = await Promise.all([
    config.stripe.prices.proMonthly
      ? buildPlanOption("pro-monthly", config.stripe.prices.proMonthly, "Pro monthly", "Monthly")
      : Promise.resolve(null),
    config.stripe.prices.proYearly
      ? buildPlanOption("pro-yearly", config.stripe.prices.proYearly, "Pro yearly", "Yearly")
      : Promise.resolve(null)
  ]);

  return plans.filter(Boolean) as StripePlanOption[];
}

export function isKnownStripePrice(priceId: string) {
  return [config.stripe.prices.proMonthly, config.stripe.prices.proYearly].filter(Boolean).includes(priceId);
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