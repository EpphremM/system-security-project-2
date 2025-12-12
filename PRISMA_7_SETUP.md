# Prisma 7 Setup Guide

## Overview

This project uses Prisma 7.1.0 with the PostgreSQL adapter for improved performance and connection management.

## Configuration Files

### 1. `prisma.config.ts`
Used for migrations and Prisma CLI operations. Uses direct `url` connection:

```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    provider: "postgresql",
    url: connectionString, // Direct connection for migrations
  },
});
```

### 2. `prisma/schema.prisma`
Schema file with datasource configuration (no URLs):

```prisma
datasource db {
  provider = "postgresql"
}
```

**Note**: URLs are removed from schema.prisma in Prisma 7. They are configured in `prisma.config.ts` for migrations and in the client code for runtime.

### 3. `src/lib/prisma.ts`
Runtime Prisma Client with PostgreSQL adapter:

```typescript
import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
  // ... other options
});
```

## Key Changes from Prisma 6

1. **No URLs in schema.prisma**: URLs moved to config files
2. **Adapter Required**: Must use `@prisma/adapter-pg` for PostgreSQL
3. **Output Path**: Generator requires explicit output path
4. **Client Location**: Generated client is in `src/generated/prisma`

## Installation

```bash
# Install dependencies
pnpm add @prisma/adapter-pg pg

# Generate Prisma Client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev
```

## Environment Variables

Required in `.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/database?schema=public"
```

Optional:
```env
PRISMA_ACCELERATE_URL="prisma://accelerate.prisma-data.net/?api_key=your-key"
DIRECT_URL="postgresql://user:password@localhost:5432/database"
```

## Migration Workflow

1. **Make schema changes** in `prisma/schema.prisma`
2. **Generate migration**:
   ```bash
   pnpm prisma migrate dev --name migration_name
   ```
3. **Client auto-regenerates** after migration

## Troubleshooting

### Error: "An output path is required"
- Add `output = "../src/generated/prisma"` to generator in schema.prisma

### Error: "Cannot find module '../generated/prisma'"
- Run `pnpm prisma generate` to generate the client
- Check that `src/generated/prisma` directory exists

### Error: "Cannot read properties of undefined"
- Ensure `DATABASE_URL` is set in environment
- Check `prisma.config.ts` has proper connection string

### Migration Errors
- Use `url` in `prisma.config.ts` datasource (not adapter)
- Adapter is only for runtime client, not migrations

## Best Practices

1. **Always generate client** after schema changes:
   ```bash
   pnpm prisma generate
   ```

2. **Use adapter in client code** for better connection management

3. **Keep migrations separate** from client configuration

4. **Test migrations** in development before production

## Prisma Accelerate (Optional)

If using Prisma Accelerate:

```typescript
import { withAccelerate } from "@prisma/extension-accelerate";

export const prisma = process.env.PRISMA_ACCELERATE_URL
  ? basePrisma.$extends(withAccelerate({}))
  : basePrisma;
```

## Summary

✅ **Installed**: `@prisma/adapter-pg` and `pg`  
✅ **Updated**: `prisma.config.ts` with adapter configuration  
✅ **Cleaned**: `schema.prisma` - removed URL fields  
✅ **Updated**: `src/lib/prisma.ts` with adapter initialization  
✅ **Generated**: Prisma Client in `src/generated/prisma`  
✅ **Migrated**: Database schema applied successfully

The setup is complete and ready for development!




