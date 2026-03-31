import { prisma } from "@/server/prisma";

interface BillingAccountRow {
  owner_session_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  subscription_status: string | null;
  plan_interval: string | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface StoredBillingAccount {
  ownerKey: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeProductId: string | null;
  subscriptionStatus: string | null;
  planInterval: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapBillingAccount(record: BillingAccountRow | null): StoredBillingAccount | null {
  if (!record) {
    return null;
  }

  return {
    ownerKey: record.owner_session_id,
    stripeCustomerId: record.stripe_customer_id,
    stripeSubscriptionId: record.stripe_subscription_id,
    stripePriceId: record.stripe_price_id,
    stripeProductId: record.stripe_product_id,
    subscriptionStatus: record.subscription_status,
    planInterval: record.plan_interval,
    currentPeriodEnd: record.current_period_end ? record.current_period_end.toISOString() : null,
    cancelAtPeriodEnd: record.cancel_at_period_end,
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString()
  };
}

async function getFirstBillingAccountByClause(sql: TemplateStringsArray, value: string) {
  const rows = await prisma.$queryRaw<BillingAccountRow[]>(sql, value);
  return mapBillingAccount(rows[0] || null);
}

export function isActiveSubscriptionStatus(status?: string | null) {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function describeBillingStatus(status?: string | null) {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trialing";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "unpaid":
      return "Unpaid";
    case "incomplete":
      return "Incomplete";
    default:
      return "No plan";
  }
}

export async function hasActivePaidAccessForOwnerKey(ownerKey: string) {
  const billing = await getBillingAccountByOwnerKey(ownerKey);
  return isActiveSubscriptionStatus(billing?.subscriptionStatus);
}

export async function getBillingAccountByOwnerKey(ownerKey: string) {
  return getFirstBillingAccountByClause(
    [
      "SELECT * FROM user_billing_accounts WHERE owner_session_id = ",
      " LIMIT 1"
    ] as unknown as TemplateStringsArray,
    ownerKey
  );
}

export async function getBillingAccountByStripeCustomerId(stripeCustomerId: string) {
  return getFirstBillingAccountByClause(
    [
      "SELECT * FROM user_billing_accounts WHERE stripe_customer_id = ",
      " LIMIT 1"
    ] as unknown as TemplateStringsArray,
    stripeCustomerId
  );
}

export async function getBillingAccountByStripeSubscriptionId(stripeSubscriptionId: string) {
  return getFirstBillingAccountByClause(
    [
      "SELECT * FROM user_billing_accounts WHERE stripe_subscription_id = ",
      " LIMIT 1"
    ] as unknown as TemplateStringsArray,
    stripeSubscriptionId
  );
}

export async function upsertBillingAccountByOwnerKey(
  ownerKey: string,
  input: Partial<Omit<StoredBillingAccount, "ownerKey" | "createdAt" | "updatedAt">>
) {
  await prisma.$executeRaw`
    INSERT INTO user_billing_accounts (
      owner_session_id,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      stripe_product_id,
      subscription_status,
      plan_interval,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at
    )
    VALUES (
      ${ownerKey},
      ${input.stripeCustomerId || null},
      ${input.stripeSubscriptionId || null},
      ${input.stripePriceId || null},
      ${input.stripeProductId || null},
      ${input.subscriptionStatus || null},
      ${input.planInterval || null},
      ${input.currentPeriodEnd ? new Date(input.currentPeriodEnd) : null},
      ${input.cancelAtPeriodEnd ?? false},
      NOW(),
      NOW()
    )
    ON CONFLICT (owner_session_id)
    DO UPDATE SET
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, user_billing_accounts.stripe_customer_id),
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, user_billing_accounts.stripe_subscription_id),
      stripe_price_id = EXCLUDED.stripe_price_id,
      stripe_product_id = EXCLUDED.stripe_product_id,
      subscription_status = EXCLUDED.subscription_status,
      plan_interval = EXCLUDED.plan_interval,
      current_period_end = EXCLUDED.current_period_end,
      cancel_at_period_end = EXCLUDED.cancel_at_period_end,
      updated_at = NOW()
  `;

  return getBillingAccountByOwnerKey(ownerKey);
}