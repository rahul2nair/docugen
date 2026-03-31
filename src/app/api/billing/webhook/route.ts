import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getBillingAccountByStripeCustomerId, getBillingAccountByStripeSubscriptionId, upsertBillingAccountByOwnerKey } from "@/server/billing-store";
import { config } from "@/server/config";
import { getStripe, mapStripeSubscription } from "@/server/stripe";

async function resolveOwnerKeyForSubscription(subscription: Stripe.Subscription) {
  const metadataOwnerKey = subscription.metadata.ownerKey?.trim();
  if (metadataOwnerKey) {
    return metadataOwnerKey;
  }

  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (customerId) {
    const fromCustomer = await getBillingAccountByStripeCustomerId(customerId);
    if (fromCustomer) {
      return fromCustomer.ownerKey;
    }
  }

  const fromSubscription = await getBillingAccountByStripeSubscriptionId(subscription.id);
  return fromSubscription?.ownerKey || null;
}

export async function POST(request: Request) {
  if (!config.stripe.webhookSecret) {
    return NextResponse.json({ error: { message: "Stripe webhook secret is not configured" } }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: { message: "Missing Stripe signature" } }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, config.stripe.webhookSecret);
  } catch (error) {
    return NextResponse.json({ error: { message: error instanceof Error ? error.message : "Invalid webhook" } }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const ownerKey = session.metadata?.ownerKey?.trim();
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (ownerKey) {
        const nextState = {
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id || null,
          stripeSubscriptionId: subscriptionId || null
        };

        if (subscriptionId) {
          const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
          await upsertBillingAccountByOwnerKey(ownerKey, {
            ...nextState,
            ...mapStripeSubscription(subscription)
          });
        } else {
          await upsertBillingAccountByOwnerKey(ownerKey, nextState);
        }
      }

      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const ownerKey = await resolveOwnerKeyForSubscription(subscription);

      if (ownerKey) {
        await upsertBillingAccountByOwnerKey(ownerKey, mapStripeSubscription(subscription));
      }

      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}