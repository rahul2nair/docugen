import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BillingConsole } from "@/components/billing-console";
import { createClient } from "@/lib/supabase/server";
import { getBillingAccountByOwnerKey, upsertBillingAccountByOwnerKey } from "@/server/billing-store";
import { config } from "@/server/config";
import { getStripe, getStripePlanOptions, isStripeConfigured, mapStripeSubscription } from "@/server/stripe";
import { userOwnerKey } from "@/server/user-data-store";

async function syncBillingFromStripe({
  ownerKey,
  checkout,
  sessionId,
  stripeCustomerId
}: {
  ownerKey: string;
  checkout?: string;
  sessionId?: string;
  stripeCustomerId?: string | null;
}) {
  if (checkout !== "success" || !isStripeConfigured()) {
    return null;
  }

  const stripe = getStripe();

  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"]
      });

      if (session.metadata?.ownerKey && session.metadata.ownerKey !== ownerKey) {
        return null;
      }

      const subscription = typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

      if (subscription) {
        return upsertBillingAccountByOwnerKey(ownerKey, mapStripeSubscription(subscription));
      }
    } catch {
      return null;
    }
  }

  if (!stripeCustomerId) {
    return null;
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      limit: 5
    });

    const latestSubscription = subscriptions.data.find((subscription) =>
      ["active", "trialing", "past_due", "incomplete"].includes(subscription.status)
    ) || subscriptions.data[0];

    if (!latestSubscription) {
      return null;
    }

    return upsertBillingAccountByOwnerKey(ownerKey, mapStripeSubscription(latestSubscription));
  } catch {
    return null;
  }
}

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=%2Fbilling");
  }

  const ownerKey = userOwnerKey(user.id);
  const { checkout, session_id: sessionId } = await searchParams;
  let billing = await getBillingAccountByOwnerKey(ownerKey);

  const syncedBilling = await syncBillingFromStripe({
    ownerKey,
    checkout,
    sessionId,
    stripeCustomerId: billing?.stripeCustomerId
  });

  if (syncedBilling) {
    billing = syncedBilling;
  }

  const trialEligible = config.stripe.trialDays > 0 && !billing?.stripeSubscriptionId;
  const plans = await getStripePlanOptions();

  return (
    <main className="pb-12">
      <BillingConsole
        email={user.email || "Account user"}
        isConfigured={isStripeConfigured()}
        plans={plans}
        billing={billing}
        trialDays={config.stripe.trialDays}
        trialEligible={trialEligible}
      />
    </main>
  );
}