import IORedis from "ioredis";
import { Queue } from "bullmq";
import { config } from "@/server/config";

let connectionInstance: IORedis | null = null;
let queueInstance: Queue | null = null;

function createConnection() {
  const conn = new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => Math.min(times * 50, 2000)
  });

  conn.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

  conn.on("connect", () => {
    console.log("Redis connected");
  });

  return conn;
}

function getConnection() {
  if (!connectionInstance) {
    connectionInstance = createConnection();
  }
  return connectionInstance;
}

function getQueue() {
  if (!queueInstance) {
    queueInstance = new Queue("document-generation", {
      connection: getConnection(),
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
  }
  return queueInstance;
}

export const connection = new Proxy({} as IORedis, {
  get(_target, prop) {
    const conn = getConnection();
    const value = (conn as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(conn) : value;
  }
}) as IORedis;

export const generationQueue = new Proxy({} as Queue, {
  get(_target, prop) {
    const queue = getQueue();
    const value = (queue as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(queue)
      : value;
  }
}) as Queue;

export type GenerationJobName = "generate" | "cleanup-my-files";
