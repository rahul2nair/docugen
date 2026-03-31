import IORedis from "ioredis";
import { Queue } from "bullmq";
import { config } from "@/server/config";

export const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

connection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

connection.on('connect', () => {
  console.log('Redis connected');
});

export const generationQueue = new Queue("document-generation", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: {
      age: config.jobRetentionHours * 60 * 60
    },
    removeOnFail: {
      age: config.jobRetentionHours * 60 * 60
    }
  }
});

export type GenerationJobName = "generate" | "cleanup-my-files";
