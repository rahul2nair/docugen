import { config } from "@/server/config";
import { connection } from "@/server/queue";

function jobOwnerKey(jobId: string) {
  return `${config.redisKeyPrefix}:api-job-owner:${jobId}`;
}

function ownerJobsKey(ownerKey: string) {
  return `${config.redisKeyPrefix}:api-owner-jobs:${ownerKey}`;
}

function ownerTtlSeconds() {
  const hours = Number.isNaN(config.jobRetentionHours) || config.jobRetentionHours <= 0 ? 24 : config.jobRetentionHours;
  return Math.floor(hours * 60 * 60);
}

function ownerJobsTtlSeconds() {
  const days = Number.isNaN(config.myFilesRetentionDays) || config.myFilesRetentionDays <= 0
    ? 30
    : config.myFilesRetentionDays;
  return Math.floor(days * 24 * 60 * 60);
}

interface OwnerJobRecord {
  id: string;
  createdAt: string;
}

function parseOwnerJobRecord(raw: string): OwnerJobRecord {
  try {
    const parsed = JSON.parse(raw) as OwnerJobRecord;
    if (parsed?.id) {
      return {
        id: parsed.id,
        createdAt: parsed.createdAt || ""
      };
    }
  } catch {
    // Fall through to legacy string-only format.
  }

  return {
    id: raw,
    createdAt: ""
  };
}

export async function trackGenerationJobForOwnerKey(ownerKey: string, jobId: string) {
  const now = new Date().toISOString();
  await connection
    .multi()
    .set(jobOwnerKey(jobId), ownerKey, "EX", ownerTtlSeconds())
    .rpush(ownerJobsKey(ownerKey), JSON.stringify({ id: jobId, createdAt: now } satisfies OwnerJobRecord))
    .ltrim(ownerJobsKey(ownerKey), -1000, -1)
    .expire(ownerJobsKey(ownerKey), ownerJobsTtlSeconds())
    .exec();
}

export async function getGenerationJobOwnerKey(jobId: string) {
  return connection.get(jobOwnerKey(jobId));
}

export async function listGenerationJobsForOwnerKey(ownerKey: string, limit = 50) {
  const boundedLimit = Math.max(1, Math.min(limit, 200));
  const raw = await connection.lrange(ownerJobsKey(ownerKey), -boundedLimit, -1);

  return raw
    .map(parseOwnerJobRecord)
    .reverse();
}