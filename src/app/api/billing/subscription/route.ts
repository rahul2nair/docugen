import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBillingAccountByOwnerKey, upsertBillingAccountByOwnerKey } from "@/server/billing-store";
import { getStripe, isStripeConfigured, mapStripeSubscription } from "@/server/stripe";
import { userOwnerKey } from "@/server/user-data-store";

const schema = z.object({
  action: z.enum(["cancel", "resume"])
});

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: { message: "Stripe billing is not configured" } }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { message: "Sign in to manage billing" } }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { message: "Invalid subscription action" } }, { status: 400 });
  }

  const ownerKey = userOwnerKey(user.id);
  const billing = await getBillingAccountByOwnerKey(ownerKey);

  if (!billing?.stripeSubscriptionId) {
    return NextResponse.json({ error: { message: "No active Stripe subscription found" } }, { status: 400 });
  }

  const stripe = getStripe();
  const updated = await stripe.subscriptions.update(billing.stripeSubscriptionId, {
    cancel_at_period_end: parsed.data.action === "cancel"
  });

  const stored = await upsertBillingAccountByOwnerKey(ownerKey, mapStripeSubscription(updated));

  return NextResponse.json({
    billing: stored
      ? {
          subscriptionStatus: stored.subscriptionStatus,
          currentPeriodEnd: stored.currentPeriodEnd,
          cancelAtPeriodEnd: stored.cancelAtPeriodEnd
        }
      : null
  });
}
