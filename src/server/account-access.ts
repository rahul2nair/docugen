import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBillingAccountByOwnerKey, isActiveSubscriptionStatus } from "@/server/billing-store";
import { userOwnerKey } from "@/server/user-data-store";

export async function getOptionalAuthenticatedAccountAccess() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      ownerKey: null,
      billing: null,
      hasPaidAccess: false
    };
  }

  const ownerKey = userOwnerKey(user.id);
  const billing = await getBillingAccountByOwnerKey(ownerKey);

  return {
    user,
    ownerKey,
    billing,
    hasPaidAccess: isActiveSubscriptionStatus(billing?.subscriptionStatus)
  };
}

export async function getAuthenticatedAccountAccess(nextPath: string) {
  const { user, ownerKey, billing, hasPaidAccess } = await getOptionalAuthenticatedAccountAccess();

  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }

  return {
    user,
    ownerKey,
    billing,
    hasPaidAccess
  };
}