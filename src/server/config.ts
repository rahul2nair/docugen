export const config = {
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  jobRetentionHours: Number(process.env.JOB_RETENTION_HOURS || 24),
  myFilesRetentionDays: Number(process.env.MY_FILES_RETENTION_DAYS || 30),
  myFilesCleanupIntervalMinutes: Number(process.env.MY_FILES_CLEANUP_INTERVAL_MINUTES || 360),
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 48),
  sessionSnapshotLimit: Number(process.env.SESSION_SNAPSHOT_LIMIT || 50),
  redisKeyPrefix: process.env.REDIS_KEY_PREFIX || "templify",
  rateLimit: {
    sessionCreateLimit: Number(process.env.RATE_LIMIT_SESSION_CREATE_LIMIT || 10),
    sessionCreateWindowSeconds: Number(process.env.RATE_LIMIT_SESSION_CREATE_WINDOW_SECONDS || 900),
    anonymousWriteLimit: Number(process.env.RATE_LIMIT_ANONYMOUS_WRITE_LIMIT || 30),
    anonymousWriteWindowSeconds: Number(process.env.RATE_LIMIT_ANONYMOUS_WRITE_WINDOW_SECONDS || 900),
    anonymousReadLimit: Number(process.env.RATE_LIMIT_ANONYMOUS_READ_LIMIT || 240),
    anonymousReadWindowSeconds: Number(process.env.RATE_LIMIT_ANONYMOUS_READ_WINDOW_SECONDS || 60),
    apiWriteLimit: Number(process.env.RATE_LIMIT_API_WRITE_LIMIT || 120),
    apiWriteWindowSeconds: Number(process.env.RATE_LIMIT_API_WRITE_WINDOW_SECONDS || 60),
    apiReadLimit: Number(process.env.RATE_LIMIT_API_READ_LIMIT || 600),
    apiReadWindowSeconds: Number(process.env.RATE_LIMIT_API_READ_WINDOW_SECONDS || 60),
    ipSafetyLimit: Number(process.env.RATE_LIMIT_IP_SAFETY_LIMIT || 240),
    ipSafetyWindowSeconds: Number(process.env.RATE_LIMIT_IP_SAFETY_WINDOW_SECONDS || 60)
  },
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  secretsEncryptionKey: process.env.SECRETS_ENCRYPTION_KEY || "",
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    trialDays: Math.max(0, Math.floor(Number(process.env.STRIPE_TRIAL_DAYS || 0))),
    prices: {
      proMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
      proYearly: process.env.STRIPE_PRICE_PRO_YEARLY || ""
    }
  },
  
  // Backblaze B2 Configuration (S3-compatible)
  b2: {
    endpoint: process.env.B2_ENDPOINT || "https://s3.eu-central-003.backblazeb2.com",
    region: process.env.B2_REGION || "eu-central-003",
    accessKeyId: process.env.B2_KEY_ID || "",
    secretAccessKey: process.env.B2_SECRET_KEY || "",
    bucket: process.env.B2_BUCKET || ""
  }
};

// Validate B2 configuration on startup
if (typeof window === "undefined") {
  // Only run on server side
  if (!config.b2.accessKeyId) {
    console.warn("⚠️  B2_KEY_ID is not set in environment variables");
  }
  if (!config.b2.secretAccessKey) {
    console.warn("⚠️  B2_SECRET_KEY is not set in environment variables");
  }
  if (!config.b2.bucket) {
    console.warn("⚠️  B2_BUCKET is not set in environment variables");
  }
  if (!config.b2.endpoint) {
    console.warn("⚠️  B2_ENDPOINT is not set in environment variables");
  }

  if (Number.isNaN(config.sessionTtlHours) || config.sessionTtlHours <= 0) {
    console.warn("⚠️  SESSION_TTL_HOURS is invalid. Falling back to 48 hours.");
  }

  if (Number.isNaN(config.myFilesRetentionDays) || config.myFilesRetentionDays <= 0) {
    console.warn("⚠️  MY_FILES_RETENTION_DAYS is invalid. Falling back to 30 days.");
  }

  if (
    Number.isNaN(config.myFilesCleanupIntervalMinutes) ||
    config.myFilesCleanupIntervalMinutes <= 0
  ) {
    console.warn("⚠️  MY_FILES_CLEANUP_INTERVAL_MINUTES is invalid. Falling back to 360 minutes.");
  }

  if (Number.isNaN(config.sessionSnapshotLimit) || config.sessionSnapshotLimit <= 0) {
    console.warn("⚠️  SESSION_SNAPSHOT_LIMIT is invalid. Falling back to 50 snapshots.");
  }

  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    console.warn(
      "⚠️  Supabase persistence disabled (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY missing)"
    );
  }

  if (!config.secretsEncryptionKey) {
    console.warn("⚠️  SECRETS_ENCRYPTION_KEY is not set; encrypted API key storage will be unavailable");
  }

  if (!config.stripe.secretKey) {
    console.warn("⚠️  STRIPE_SECRET_KEY is not set; billing checkout will be unavailable");
  }

  if (!config.stripe.webhookSecret) {
    console.warn("⚠️  STRIPE_WEBHOOK_SECRET is not set; Stripe subscription sync will be unavailable");
  }

  if (Number.isNaN(config.stripe.trialDays) || config.stripe.trialDays < 0) {
    console.warn("⚠️  STRIPE_TRIAL_DAYS is invalid. Falling back to no trial.");
  }

  if (
    config.b2.accessKeyId &&
    config.b2.secretAccessKey &&
    config.b2.bucket &&
    config.b2.endpoint
  ) {
    console.log("✅ Backblaze B2 configuration loaded successfully");
  }
}
