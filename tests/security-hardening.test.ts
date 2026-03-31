import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { POST as createSessionRoute } from "../src/app/api/v1/sessions/route";
import { POST as createGenerationRoute } from "../src/app/api/v1/generations/route";
import { config } from "../src/server/config";
import { generationQueue, connection } from "../src/server/queue";
import { renderRequest } from "../src/server/render";

const originalConfig = {
  redisKeyPrefix: config.redisKeyPrefix,
  rateLimit: { ...config.rateLimit }
};

function uniquePrefix(label: string) {
  return `templify-test:${label}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

async function deleteKeysForPrefix(prefix: string) {
  const keys = await connection.keys(`${prefix}*`);
  if (keys.length) {
    await connection.del(keys);
  }
}

beforeEach(async () => {
  config.redisKeyPrefix = uniquePrefix("suite");
  config.rateLimit.sessionCreateLimit = originalConfig.rateLimit.sessionCreateLimit;
  config.rateLimit.sessionCreateWindowSeconds = originalConfig.rateLimit.sessionCreateWindowSeconds;
  config.rateLimit.anonymousWriteLimit = originalConfig.rateLimit.anonymousWriteLimit;
  config.rateLimit.anonymousWriteWindowSeconds = originalConfig.rateLimit.anonymousWriteWindowSeconds;
  config.rateLimit.anonymousReadLimit = originalConfig.rateLimit.anonymousReadLimit;
  config.rateLimit.anonymousReadWindowSeconds = originalConfig.rateLimit.anonymousReadWindowSeconds;
  config.rateLimit.apiWriteLimit = originalConfig.rateLimit.apiWriteLimit;
  config.rateLimit.apiWriteWindowSeconds = originalConfig.rateLimit.apiWriteWindowSeconds;
  config.rateLimit.apiReadLimit = originalConfig.rateLimit.apiReadLimit;
  config.rateLimit.apiReadWindowSeconds = originalConfig.rateLimit.apiReadWindowSeconds;
  config.rateLimit.ipSafetyLimit = originalConfig.rateLimit.ipSafetyLimit;
  config.rateLimit.ipSafetyWindowSeconds = originalConfig.rateLimit.ipSafetyWindowSeconds;
});

after(async () => {
  await deleteKeysForPrefix("templify-test:");
  config.redisKeyPrefix = originalConfig.redisKeyPrefix;
  Object.assign(config.rateLimit, originalConfig.rateLimit);
  await generationQueue.close();
  await connection.quit();
});

test("session creation route returns 429 after IP quota is exceeded", async () => {
  config.redisKeyPrefix = uniquePrefix("session-limit");
  config.rateLimit.sessionCreateLimit = 1;
  config.rateLimit.sessionCreateWindowSeconds = 60;

  const firstResponse = await createSessionRoute(
    new Request("http://localhost/api/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10"
      },
      body: JSON.stringify({})
    })
  );

  const secondResponse = await createSessionRoute(
    new Request("http://localhost/api/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.10"
      },
      body: JSON.stringify({})
    })
  );

  assert.equal(firstResponse.status, 201);
  assert.equal(secondResponse.status, 429);
  assert.equal(secondResponse.headers.get("Retry-After"), "60");

  const payload = await secondResponse.json();
  assert.equal(payload.error.code, "RATE_LIMITED");
});

test("generation route rejects invalid anonymous session tokens before queueing", async () => {
  config.redisKeyPrefix = uniquePrefix("invalid-session");
  config.rateLimit.anonymousWriteLimit = 100;
  config.rateLimit.anonymousWriteWindowSeconds = 60;

  const response = await createGenerationRoute(
    new Request("http://localhost/api/v1/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "198.51.100.24"
      },
      body: JSON.stringify({
        mode: "template_fill",
        templateSource: {
          type: "inline",
          syntax: "handlebars",
          content: "<p>Hello {{name}}</p>"
        },
        data: {
          name: "Rahul"
        },
        outputs: ["html"],
        session: {
          token: "invalid-token",
          revision: 0
        }
      })
    })
  );

  assert.equal(response.status, 401);

  const payload = await response.json();
  assert.equal(payload.error.code, "UNAUTHORIZED");
  assert.match(payload.error.message, /invalid or expired/i);
});

test("renderRequest strips unsafe template HTML and branding values", async () => {
  const result = await renderRequest({
    mode: "template_fill",
    templateSource: {
      type: "inline",
      syntax: "handlebars",
      content: `
        <section>
          <script>alert('xss')</script>
          <a href="javascript:alert('bad')">Open</a>
          <span style="background:url(javascript:alert('x'));color:red">{{{name}}}</span>
        </section>
      `
    },
    data: {
      name: `<img src="https://example.com/logo.png" onerror="alert('xss')" />`
    },
    outputs: ["html"],
    options: {
      branding: {
        companyName: "Security Test",
        primaryColor: "url(javascript:alert('x'))",
        accentColor: "#abc",
        logoUrl: "javascript:alert('xss')"
      }
    }
  });

  assert.ok(result.html);
  assert.doesNotMatch(result.html!, /<script/i);
  assert.doesNotMatch(result.html!, /javascript:/i);
  assert.doesNotMatch(result.html!, /onerror=/i);
  assert.doesNotMatch(result.html!, /background:url/i);
  assert.match(result.html!, /color:red/i);
  assert.match(result.html!, /#8d6334/i);
});