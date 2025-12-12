import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create PostgreSQL adapter
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// Base Prisma Client with adapter and query optimization
const basePrisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  errorFormat: "pretty",
});

// Extend with Prisma Accelerate for connection pooling (if PRISMA_ACCELERATE_URL is set)
// Note: When using Accelerate, you may want to use a different adapter configuration
export const prisma = process.env.PRISMA_ACCELERATE_URL
  ? basePrisma.$extends(
      withAccelerate({
        // Accelerate configuration options
      })
    )
  : basePrisma;

// Type helper for Accelerate client
export type PrismaClientWithAccelerate = typeof prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma as PrismaClient;

// Helper function for optimized queries
export async function optimizedQuery<T>(
  queryFn: (client: typeof prisma) => Promise<T>
): Promise<T> {
  // Add query hints and optimizations
  return queryFn(prisma);
}

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
if (typeof window === "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
