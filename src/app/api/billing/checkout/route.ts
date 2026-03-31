import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getBillingAccountByOwnerKey, upsertBillingAccountByOwnerKey } from "@/server/billing-store";
import { config } from "@/server/config";
import { getStripe, isKnownStripePrice, isStripeConfigured } from "@/server/stripe";
import { userOwnerKey } from "@/server/user-data-store";

const checkoutSchema = z.object({
  priceId: z.string().trim().min(1),
  withTrial: z.boolean().optional()
});

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: { message: "Stripe checkout is not configured" } }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: { message: "Sign in to manage billing" } }, { status: 401 });
  }

  const parsed = checkoutSchema.safeParse(await request.json());

  if (!parsed.success || !isKnownStripePrice(parsed.data.priceId)) {
    return NextResponse.json({ error: { message: "Invalid price selection" } }, { status: 400 });
  }

  const ownerKey = userOwnerKey(user.id);
  const stripe = getStripe();
  const existingBilling = await getBillingAccountByOwnerKey(ownerKey);
  const wantsTrial = parsed.data.withTrial !== false;
  const isTrialEligible = config.stripe.trialDays > 0 && !existingBilling?.stripeSubscriptionId;
  const shouldApplyTrial = wantsTrial && isTrialEligible;

  let stripeCustomerId = existingBilling?.stripeCustomerId || null;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: {
        ownerKey,
        supabaseUserId: user.id
      }
    });

    stripeCustomerId = customer.id;
    await upsertBillingAccountByOwnerKey(ownerKey, {
      stripeCustomerId
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: parsed.data.priceId, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${config.appUrl}/billing?checkout=success`,
    cancel_url: `${config.appUrl}/billing?checkout=cancel`,
    metadata: {
      ownerKey,
      supabaseUserId: user.id
    },
    subscription_data: {
      ...(shouldApplyTrial ? { trial_period_days: config.stripe.trialDays } : {}),
      metadata: {
        ownerKey,
        supabaseUserId: user.id
      }
    }
  });

  return NextResponse.json({ url: session.url });
}