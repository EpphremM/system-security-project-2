# Visitor Management System

A secure and efficient visitor management system built with Next.js 16, featuring modern authentication, access control, and comprehensive visitor tracking.

## Features

- 🔐 **Secure Authentication** - NextAuth.js v5 (beta) with credentials provider
- 🛡️ **Access Control** - Role-based permissions (Admin, Security, Receptionist, User)
- 📊 **Visitor Management** - Complete visitor lifecycle tracking
- 🔒 **Security Features** - Rate limiting, security headers, encryption utilities
- 🎨 **Modern UI** - shadcn/ui components with Tailwind CSS
- 📝 **Audit Logging** - Comprehensive visitor and access logs
- 🗄️ **Database** - PostgreSQL with Prisma ORM

## Tech Stack

- **Framework**: Next.js 16.0.8
- **React**: 19.2.1
- **Database**: PostgreSQL with Prisma
- **Authentication**: next-auth@beta
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Validation**: Zod
- **Security**: bcryptjs, argon2, rate-limiter-flexible

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- pnpm (recommended) or npm/yarn

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env.local
   ```
   
   Edit `.env.local` and configure:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `NEXTAUTH_URL` - Your application URL (e.g., `http://localhost:3000`)
   - `NEXTAUTH_SECRET` - Generate a secret key (use `openssl rand -base64 32`)

4. **Set up the database**:
   ```bash
   # Generate Prisma Client
   pnpm prisma generate
   
   # Run migrations
   pnpm prisma migrate dev --name init
   ```

5. **Create an admin user** (optional):
   You can create a seed script or manually create a user in the database. Example:
   ```typescript
   // scripts/seed.ts
   import { prisma } from "@/lib/prisma";
   import { hash } from "bcryptjs";
   
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
   }
   ```

6. **Start the development server**:
   ```bash
   pnpm dev
   ```

7. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication routes
│   │   │   ├── login/
│   │   │   └── error/
│   │   ├── (dashboard)/     # Protected dashboard routes
│   │   ├── api/             # API routes
│   │   │   └── auth/        # NextAuth handlers
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   ├── loading.tsx      # Loading UI
│   │   ├── error.tsx        # Error boundary
│   │   └── not-found.tsx    # 404 page
│   ├── components/
│   │   ├── ui/              # shadcn/ui components
│   │   └── shared/          # Shared components
│   ├── lib/
│   │   ├── auth/            # Authentication configuration
│   │   ├── access/          # Access control & permissions
│   │   ├── utils/           # Utility functions
│   │   └── prisma.ts        # Prisma client
│   ├── types/               # TypeScript types
│   └── middleware.ts        # Next.js middleware
├── prisma/
│   └── schema.prisma        # Database schema
└── public/                  # Static assets
```

## Database Schema

The system includes the following main models:

- **User** - System users with roles and authentication
- **Visitor** - Visitor information and status
- **VisitorLog** - Audit trail of visitor actions
- **AccessLog** - Access control and security logs
- **Session** - User sessions (NextAuth)
- **Account** - OAuth accounts (NextAuth)

## User Roles & Permissions

- **ADMIN** - Full access to all features
- **SECURITY** - Can check in/out visitors and view logs
- **RECEPTIONIST** - Can create, update, and manage visitors
- **USER** - Can create visitor requests and view own visitors

## Security Features

- ✅ Rate limiting on API routes
- ✅ Security headers (CSP, HSTS, X-Frame-Options, etc.)
- ✅ Password hashing with bcryptjs/argon2
- ✅ JWT-based session management
- ✅ Role-based access control
- ✅ Audit logging
- ✅ Input validation with Zod

## Development

### Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm prisma studio` - Open Prisma Studio (database GUI)
- `pnpm prisma migrate dev` - Create and apply migrations
- `pnpm prisma generate` - Generate Prisma Client

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

## Environment Variables

See `env.example` for all available environment variables.

## License

MIT

## Support

For issues and questions, please open an issue in the repository.
