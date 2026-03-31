CREATE TABLE IF NOT EXISTS "user_billing_accounts" (
  "owner_session_id" TEXT PRIMARY KEY,
  "stripe_customer_id" TEXT UNIQUE,
  "stripe_subscription_id" TEXT UNIQUE,
  "stripe_price_id" TEXT,
  "stripe_product_id" TEXT,
  "subscription_status" TEXT,
  "plan_interval" TEXT,
  "current_period_end" TIMESTAMPTZ(6),
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);