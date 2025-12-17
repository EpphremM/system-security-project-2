
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { UserRole } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/lib/utils/password-hashing";
import { calculatePasswordExpiration } from "../src/lib/utils/password-policy";





if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set. Make sure .env file exists.");
}

console.log("📦 Using Prisma Client from lib...");
console.log("🔗 Database URL:", process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 20)}...` : "NOT SET");

async function main() {
  console.log("🌱 Starting database seed...");
  
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful");
    const result = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `;
    
    if (result.length === 0) {
      console.error("❌ ERROR: 'users' table does not exist in the database!");
      console.error("💡 Attempting to list all tables...");
      
      const allTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      
      console.log(`📊 Found ${allTables.length} tables in database:`);
      allTables.forEach(t => console.log(`  - ${t.table_name}`));
      
      if (allTables.length === 0) {
        console.error("\n❌ Database is empty! Running db:push to create tables...");
        const { execSync } = require('child_process');
        try {
          execSync('pnpm db:push', { stdio: 'inherit' });
          console.log("✅ Tables created, retrying seed...");
        } catch (e) {
          console.error("❌ Failed to create tables:", e);
          process.exit(1);
        }
      } else {
        console.error("\n💡 Please run: pnpm db:push or pnpm db:migrate");
        process.exit(1);
      }
    } else {
      console.log("✅ Users table exists");
    }
  } catch (error: any) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }

  const testPassword = "Email1@gmail";
  console.log(`🔐 Hashing password: ${testPassword}`);
  const passwordHash = await hashPassword(testPassword);
  console.log("✅ Password hashed successfully");
  const passwordExpiresAt = calculatePasswordExpiration(new Date());

  const users = [
    {
      email: "visitor@test.com",
      name: "Test Visitor",
      department: "External",
      legacyRole: UserRole.VISITOR,
    },
    {
      email: "user@test.com",
      name: "Test User",
      department: "IT",
      legacyRole: UserRole.USER,
    },
    {
      email: "staff@test.com",
      name: "Test Staff",
      department: "Engineering",
      legacyRole: UserRole.STAFF,
    },
    {
      email: "receptionist@test.com",
      name: "Test Receptionist",
      department: "Front Desk",
      legacyRole: UserRole.RECEPTIONIST,
    },
    {
      email: "depthead@test.com",
      name: "Test Department Head",
      department: "Engineering",
      legacyRole: UserRole.DEPT_HEAD,
    },
    {
      email: "hr@test.com",
      name: "Test HR Manager",
      department: "Human Resources",
      legacyRole: UserRole.HR,
    },
    {
      email: "security@test.com",
      name: "Test Security Officer",
      department: "Security",
      legacyRole: UserRole.SECURITY,
    },
    {
      email: "itadmin@test.com",
      name: "Test IT Admin",
      department: "IT",
      legacyRole: UserRole.IT_ADMIN,
    },
    {
      email: "admin@test.com",
      name: "Test Admin",
      department: "Administration",
      legacyRole: UserRole.ADMIN,
    },
    {
      email: "superadmin@test.com",
      name: "Test Super Admin",
      department: "Administration",
      legacyRole: UserRole.SUPER_ADMIN,
    },
  ];

  console.log("📝 Creating users...");

  for (const userData of users) {
    try {
      const existing = await prisma.user.findUnique({
        where: { email: userData.email },
      });

    if (existing) {
      console.log(`⚠️  User ${userData.email} already exists, updating...`);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          legacyRole: userData.legacyRole,
          passwordHash, // Update password hash
          passwordChangedAt: new Date(),
          passwordExpiresAt,
          emailVerified: new Date(), // Auto-verify
        },
      });
      console.log(`✅ Updated user: ${userData.email} (${userData.legacyRole}) - Password reset to: ${testPassword}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        department: userData.department,
        passwordHash,
        passwordChangedAt: new Date(),
        passwordExpiresAt,
        legacyRole: userData.legacyRole,
        emailVerified: new Date(), // Auto-verify for test users
      },
    });

      console.log(`✅ Created user: ${userData.email} (${userData.legacyRole})`);
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.error(`\n❌ CRITICAL: Database tables do not exist!`);
        console.error(`💡 Please run: pnpm db:push`);
        console.error(`   This will create all necessary tables in your database.`);
        throw new Error("Database tables not found. Run 'pnpm db:push' first.");
      }
      throw error;
    }
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Test User Credentials:");
  console.log("=" .repeat(50));
  users.forEach((user) => {
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${testPassword}`);
    console.log(`Role: ${user.legacyRole}`);
    console.log("-".repeat(50));
  });
  console.log("\n⚠️  IMPORTANT: Change these passwords in production!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

