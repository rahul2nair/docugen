import { config } from "@/server/config";
import { connection } from "@/server/queue";

function jobOwnerKey(jobId: string) {
  return `${config.redisKeyPrefix}:api-job-owner:${jobId}`;
}

function ownerTtlSeconds() {
  const hours = Number.isNaN(config.jobRetentionHours) || config.jobRetentionHours <= 0 ? 24 : config.jobRetentionHours;
  return Math.floor(hours * 60 * 60);
}

export async function trackGenerationJobForOwnerKey(ownerKey: string, jobId: string) {
  await connection.set(jobOwnerKey(jobId), ownerKey, "EX", ownerTtlSeconds());
}

export async function getGenerationJobOwnerKey(jobId: string) {
  return connection.get(jobOwnerKey(jobId));
}