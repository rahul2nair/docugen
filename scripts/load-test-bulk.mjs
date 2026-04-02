#!/usr/bin/env node

import process from "node:process";

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  const parsed = raw ? Number(raw) : fallback;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildRow(index, userId) {
  const day = ((index % 28) + 1).toString().padStart(2, "0");
  return {
    candidate_name: `Load Test Candidate ${userId}-${index + 1}`,
    company_name: "Acme Labs",
    job_title: "Solution Architect",
    salary: "$120,000",
    start_date: `2026-05-${day}`,
    manager_name: "Asha Menon"
  };
}

function buildRequests(rowsPerUser, saveToMyFiles) {
  return Array.from({ length: rowsPerUser }, (_, index) => ({
    mode: "template_fill",
    templateSource: {
      type: "builtin",
      templateId: "offer_letter"
    },
    data: buildRow(index, "user"),
    saveToMyFiles,
    outputs: ["html", "pdf"],
    options: {
      pdf: {
        format: "A4",
        margin: "normal"
      }
    }
  }));
}

async function createSession(baseUrl) {
  const response = await fetch(`${baseUrl}/api/v1/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({})
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.token) {
    throw new Error(`Session creation failed (${response.status}): ${JSON.stringify(body)}`);
  }

  return body.token;
}

async function queueBulkForUser({ baseUrl, rowsPerUser, saveToMyFiles, userIndex, sharedSessionToken, apiKey }) {
  const startedAt = Date.now();
  const sessionToken = apiKey ? null : (sharedSessionToken || await createSession(baseUrl));

  const requests = buildRequests(rowsPerUser, saveToMyFiles).map((request, index) => ({
    ...request,
    data: buildRow(index, userIndex + 1)
  }));

  const response = await fetch(`${baseUrl}/api/v1/generations/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      ...(sessionToken ? { sessionToken } : {}),
      saveToMyFiles,
      requests
    })
  });

  const body = await response.json().catch(() => ({}));
  const elapsedMs = Date.now() - startedAt;

  return {
    user: userIndex + 1,
    ok: response.ok,
    status: response.status,
    elapsedMs,
    queued: Number(body?.queued || 0),
    error: body?.error?.message || null,
    sessionToken
  };
}

async function main() {
  const baseUrl = (process.env.LOAD_TEST_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
  const concurrentUsers = parseIntEnv("LOAD_TEST_CONCURRENT_USERS", 10);
  const rowsPerUser = Math.min(parseIntEnv("LOAD_TEST_ROWS_PER_USER", 25), 25);
  const saveToMyFiles = (process.env.LOAD_TEST_SAVE_TO_MY_FILES || "false").toLowerCase() === "true";
  const staggerMs = parseIntEnv("LOAD_TEST_USER_STAGGER_MS", 0);
  const useSharedSession = (process.env.LOAD_TEST_SHARED_SESSION || "false").toLowerCase() === "true";
  const suppliedSessionToken = (process.env.LOAD_TEST_SESSION_TOKEN || "").trim();
  const apiKey = (process.env.LOAD_TEST_API_KEY || "").trim();

  console.log("--- Bulk Load Test ---");
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Concurrent users: ${concurrentUsers}`);
  console.log(`Rows per user: ${rowsPerUser}`);
  console.log(`Save to My Files: ${saveToMyFiles}`);
  console.log(`User stagger: ${staggerMs}ms`);
  console.log(`Auth mode: ${apiKey ? "API key" : "Session token"}`);
  console.log(`Shared session: ${useSharedSession}`);
  if (suppliedSessionToken) {
    console.log("Using supplied session token: true");
  }

  const sharedSessionToken = apiKey
    ? null
    : (suppliedSessionToken || (useSharedSession ? await createSession(baseUrl) : null));

  const launchedAt = Date.now();
  const promises = [];

  for (let userIndex = 0; userIndex < concurrentUsers; userIndex += 1) {
    const task = (async () => {
      if (staggerMs > 0) {
        await sleep(staggerMs * userIndex);
      }
      return queueBulkForUser({
        baseUrl,
        rowsPerUser,
        saveToMyFiles,
        userIndex,
        sharedSessionToken,
        apiKey
      });
    })();
    promises.push(task);
  }

  const results = await Promise.all(promises);
  const totalElapsedMs = Date.now() - launchedAt;

  const success = results.filter((item) => item.ok);
  const failed = results.filter((item) => !item.ok);
  const totalQueued = success.reduce((sum, item) => sum + item.queued, 0);
  const maxLatencyMs = results.reduce((max, item) => Math.max(max, item.elapsedMs), 0);
  const avgLatencyMs = results.length
    ? Math.round(results.reduce((sum, item) => sum + item.elapsedMs, 0) / results.length)
    : 0;

  console.log("\n--- Results ---");
  console.log(`Users succeeded: ${success.length}/${concurrentUsers}`);
  console.log(`Total queued jobs: ${totalQueued}`);
  console.log(`Avg queue latency: ${avgLatencyMs}ms`);
  console.log(`Max queue latency: ${maxLatencyMs}ms`);
  console.log(`Total wall time: ${totalElapsedMs}ms`);

  if (failed.length) {
    console.log("\nFailures:");
    for (const item of failed) {
      console.log(`- user ${item.user}: status=${item.status}, error=${item.error || "unknown"}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nAll bulk submissions queued successfully.");
}

main().catch((error) => {
  console.error("Load test failed:", error);
  process.exitCode = 1;
});