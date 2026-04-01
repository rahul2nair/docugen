import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BillingConsole } from "@/components/billing-console";
import { Header } from "@/components/header";
import { createClient } from "@/lib/supabase/server";
import { getBillingAccountByOwnerKey } from "@/server/billing-store";
import { config } from "@/server/config";
import { getStripePlanOptions, isStripeConfigured } from "@/server/stripe";
import { userOwnerKey } from "@/server/user-data-store";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?next=%2Fbilling");
  }

  const billing = await getBillingAccountByOwnerKey(userOwnerKey(user.id));
  const trialEligible = config.stripe.trialDays > 0 && !billing?.stripeSubscriptionId;
  const plans = await getStripePlanOptions();

  return (
    <main className="pb-12">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
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