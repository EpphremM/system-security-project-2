# Quick Setup Guide

## 1. Install Dependencies

```bash
pnpm install
```

## 2. Configure Environment Variables

Copy the example environment file:
```bash
cp env.example .env.local
```

Edit `.env.local` and set:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXTAUTH_URL` - Application URL (default: `http://localhost:3000`)
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`

## 3. Set Up Database

Generate Prisma Client:
```bash
pnpm db:generate
```

Create and run migrations:
```bash
pnpm db:migrate
```

## 4. (Optional) Create Admin User

You can create an admin user using Prisma Studio:
```bash
pnpm db:studio
```

Or create a seed script in `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash("admin123", 10);
  
  await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash: hashedPassword,
      role: "ADMIN",
    },
  });
  
  console.log("Admin user created!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Then run:
```bash
pnpm db:seed
```

## 5. Start Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` and log in with your admin credentials.

## Project Structure Overview

- `src/app/` - Next.js App Router pages and routes
  - `(auth)/` - Authentication pages (login, error)
  - `(dashboard)/` - Protected dashboard pages
  - `api/` - API routes (NextAuth handlers)
- `src/components/` - React components
  - `ui/` - shadcn/ui components
  - `shared/` - Reusable shared components
- `src/lib/` - Utilities and configurations
  - `auth/` - NextAuth configuration
  - `access/` - Permission and access control
  - `utils/` - Helper functions
- `prisma/` - Database schema and migrations
- `src/types/` - TypeScript type definitions

## Next Steps

1. Customize the dashboard UI
2. Add visitor management pages (create, list, edit)
3. Implement visitor check-in/check-out functionality
4. Add email notifications (configure SMTP in `.env.local`)
5. Set up WebAuthn for passwordless authentication (optional)

## Troubleshooting

### Database Connection Issues
- Verify your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check database credentials

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your application URL
- Ensure user exists in database with correct password hash

### Build Errors
- Run `pnpm db:generate` to regenerate Prisma Client
- Clear `.next` folder and rebuild
- Check TypeScript errors with `pnpm lint`




