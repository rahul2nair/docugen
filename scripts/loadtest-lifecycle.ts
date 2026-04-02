import "dotenv/config";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  createManagedApiKeyByOwnerKey,
  deleteApiKeyByOwnerKey,
  listApiKeysByOwnerKeys,
  userOwnerKey
} from "@/server/user-data-store";
import { upsertBillingAccountByOwnerKey } from "@/server/billing-store";
import type { ApiKeyScope } from "@/lib/api-key-scopes";

const MANIFEST_PATH = resolve(process.cwd(), process.env.LOAD_TEST_USERS_FILE || "scripts/load-test-users.generated.json");
const DEFAULT_SCOPES: ApiKeyScope[] = ["generations:create", "generations:create:batch", "generations:read"];

type LifecycleCommand = "seed" | "test" | "teardown" | "full";

type ManagedLoadTestUser = {
  email: string;
  userId: string;
  ownerKey: string;
  apiKeyId?: string;
  apiKey?: string;
  createdAt: string;
  disabledAt?: string;
  deletedAt?: string;
};

type ManifestShape = {
  generatedAt: string;
  prefix: string;
  domain: string;
  users: ManagedLoadTestUser[];
};

function parseBooleanEnv(name: string, defaultValue: boolean) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "Supabase admin env vars are required: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function readManifest(): Promise<ManifestShape | null> {
  if (!existsSync(MANIFEST_PATH)) {
    return null;
  }

  const content = await readFile(MANIFEST_PATH, "utf8");
  return JSON.parse(content) as ManifestShape;
}

async function writeManifest(manifest: ManifestShape) {
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function findSupabaseUserByEmail(admin: ReturnType<typeof getSupabaseAdminClient>, email: string) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list Supabase users: ${error.message}`);
    }

    const users = data.users || [];
    const found = users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (found) {
      return found;
    }

    if (users.length < perPage) {
      return null;
    }

    page += 1;
  }
}

async function ensureSupabaseUser(admin: ReturnType<typeof getSupabaseAdminClient>, email: string, password: string) {
  const existing = await findSupabaseUserByEmail(admin, email);
  if (existing) {
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      load_test_user: true
    }
  });

  if (error || !data.user?.id) {
    throw new Error(`Failed to create Supabase user (${email}): ${error?.message || "Unknown error"}`);
  }

  return data.user.id;
}

async function disableSupabaseUser(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string) {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: "876000h"
  } as any);

  if (error) {
    throw new Error(`Failed to disable Supabase user ${userId}: ${error.message}`);
  }
}

async function deleteSupabaseUser(admin: ReturnType<typeof getSupabaseAdminClient>, userId: string) {
  const { error } = await admin.auth.admin.deleteUser(userId, true);
  if (error) {
    throw new Error(`Failed to delete Supabase user ${userId}: ${error.message}`);
  }
}

async function seedUsers() {
  const admin = getSupabaseAdminClient();
  const prefix = process.env.LOAD_TEST_USER_PREFIX || "loadtest";
  const domain = process.env.LOAD_TEST_USER_DOMAIN || "example.test";
  const password = process.env.LOAD_TEST_USER_PASSWORD || "ChangeMe-LoadTest-123!";
  const count = Number.parseInt(process.env.LOAD_TEST_USER_COUNT || "3", 10);
  const subscriptionStatus = process.env.LOAD_TEST_SUBSCRIPTION_STATUS || "active";
  const planInterval = process.env.LOAD_TEST_PLAN_INTERVAL || "month";
  const scopes = DEFAULT_SCOPES;

  if (!Number.isFinite(count) || count <= 0) {
    throw new Error("LOAD_TEST_USER_COUNT must be a positive integer");
  }

  const users: ManagedLoadTestUser[] = [];

  for (let index = 1; index <= count; index += 1) {
    const email = `${prefix}+${index}@${domain}`;
    const userId = await ensureSupabaseUser(admin, email, password);
    const ownerKey = userOwnerKey(userId);

    const keyResult = await createManagedApiKeyByOwnerKey(ownerKey, scopes, {
      label: `load-test-${prefix}-${index}`,
      createdBy: "scripts/loadtest-lifecycle"
    });

    await upsertBillingAccountByOwnerKey(ownerKey, {
      subscriptionStatus,
      planInterval,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    });

    users.push({
      email,
      userId,
      ownerKey,
      apiKeyId: keyResult.id,
      apiKey: keyResult.apiKey,
      createdAt: new Date().toISOString()
    });

    console.log(`Seeded user ${email} (${userId}) with owner key ${ownerKey}`);
  }

  const manifest: ManifestShape = {
    generatedAt: new Date().toISOString(),
    prefix,
    domain,
    users
  };

  await writeManifest(manifest);
  console.log(`Wrote lifecycle manifest: ${MANIFEST_PATH}`);
  return manifest;
}

async function runBulkLoadTest(manifest?: ManifestShape) {
  const currentManifest = manifest || (await readManifest());
  if (!currentManifest?.users.length) {
    throw new Error(`No users found in manifest: ${MANIFEST_PATH}`);
  }

  const apiKey = process.env.LOAD_TEST_API_KEY || currentManifest.users[0]?.apiKey;
  if (!apiKey) {
    throw new Error("No API key available. Set LOAD_TEST_API_KEY or run seed first.");
  }

  const baseUrl = getRequiredEnv("LOAD_TEST_BASE_URL");

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn("node", ["scripts/load-test-bulk.mjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        LOAD_TEST_BASE_URL: baseUrl,
        LOAD_TEST_API_KEY: apiKey
      }
    });

    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`Bulk load test failed with exit code ${code}`));
    });
  });
}

async function teardownUsers(options: { disableUsers: boolean; deleteUsers: boolean }) {
  const admin = getSupabaseAdminClient();
  const manifest = await readManifest();

  if (!manifest?.users.length) {
    console.log(`No manifest users to teardown in ${MANIFEST_PATH}`);
    return;
  }

  for (const user of manifest.users) {
    const keys = await listApiKeysByOwnerKeys([user.ownerKey]);

    for (const key of keys) {
      await deleteApiKeyByOwnerKey(user.ownerKey, key.id);
      console.log(`Revoked API key ${key.id} for ${user.email}`);
    }

    await upsertBillingAccountByOwnerKey(user.ownerKey, {
      subscriptionStatus: "canceled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date().toISOString()
    });

    if (options.deleteUsers) {
      await deleteSupabaseUser(admin, user.userId);
      user.deletedAt = new Date().toISOString();
      console.log(`Deleted Supabase user ${user.email}`);
    } else if (options.disableUsers) {
      await disableSupabaseUser(admin, user.userId);
      user.disabledAt = new Date().toISOString();
      console.log(`Disabled Supabase user ${user.email}`);
    }
  }

  await writeManifest({
    ...manifest,
    generatedAt: new Date().toISOString(),
    users: manifest.users
  });
}

async function main() {
  const command = (process.argv[2] || "full") as LifecycleCommand;

  if (!["seed", "test", "teardown", "full"].includes(command)) {
    throw new Error(`Unknown command: ${command}. Use one of: seed, test, teardown, full`);
  }

  if (command === "seed") {
    await seedUsers();
    return;
  }

  if (command === "test") {
    await runBulkLoadTest();
    return;
  }

  if (command === "teardown") {
    await teardownUsers({
      disableUsers: parseBooleanEnv("LOAD_TEST_DISABLE_USERS", true),
      deleteUsers: parseBooleanEnv("LOAD_TEST_DELETE_USERS", false)
    });
    return;
  }

  const manifest = await seedUsers();

  if (!parseBooleanEnv("LOAD_TEST_SKIP_BULK_TEST", false)) {
    await runBulkLoadTest(manifest);
  }

  await teardownUsers({
    disableUsers: parseBooleanEnv("LOAD_TEST_DISABLE_USERS", true),
    deleteUsers: parseBooleanEnv("LOAD_TEST_DELETE_USERS", false)
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
