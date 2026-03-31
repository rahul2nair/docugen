import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL?.trim() || process.env.DIRECT_URL?.trim();

function createPrismaClient() {
  if (!connectionString) {
    throw new Error("Prisma requires DATABASE_URL or DIRECT_URL to be configured");
  }

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString
    })
  });
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}