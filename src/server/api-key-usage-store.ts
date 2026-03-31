import { config } from "@/server/config";
import { connection } from "@/server/queue";

function lastUsedKey(id: string) {
  return `${config.redisKeyPrefix}:api-key:${id}:last-used`;
}

export async function markApiKeyLastUsed(id: string, timestamp = new Date().toISOString()) {
  await connection.set(lastUsedKey(id), timestamp);
}

export async function getApiKeyLastUsedAt(id: string) {
  return connection.get(lastUsedKey(id));
}