import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};


const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});


const basePrisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  errorFormat: "pretty",
});



export const prisma = process.env.PRISMA_ACCELERATE_URL
  ? basePrisma.$extends(
      withAccelerate({
        
      })
    )
  : basePrisma;


export type PrismaClientWithAccelerate = typeof prisma;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma as PrismaClient;


export async function optimizedQuery<T>(
  queryFn: (client: typeof prisma) => Promise<T>
): Promise<T> {
  
  return queryFn(prisma);
}


export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}


if (typeof window === "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}
