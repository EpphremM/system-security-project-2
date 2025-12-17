import { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/utils/password-hashing";
import { 
  checkAccountLockout, 
  recordFailedLogin, 
  resetFailedLoginAttempts 
} from "@/lib/utils/account-lockout";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAuth = nextUrl.pathname.startsWith("/auth");

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; 
      } else if (isOnAuth) {
        if (isLoggedIn) {
          const url = new URL("/dashboard", nextUrl);
          return Response.redirect(url);
        }
        return true;
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.department = user.department;
        token.securityClearance = user.securityClearance;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.department = token.department as string;
        session.user.securityClearance = token.securityClearance as string;
        session.user.sessionVersion = token.sessionVersion as number;
      }
      return session;
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = loginSchema.safeParse(credentials);

        if (!parsedCredentials.success) {
          return null;
        }

        const { email, password } = parsedCredentials.data;

        
        
        const accountLockout = await checkAccountLockout(email);
        if (accountLockout.locked) {
          throw new Error(`Account locked. Try again in ${accountLockout.retryAfter} seconds.`);
        }

        

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            role: true,
          },
        });

        if (!user || !user.passwordHash) {
          

          

          await recordFailedLogin(email, "unknown");
          return null;
        }

        

        const passwordsMatch = await verifyPassword(password, user.passwordHash);

        if (!passwordsMatch) {
          

          

          await recordFailedLogin(email, "unknown");
          
          

          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "auth.failed_login",
              resource: "user",
              resourceId: user.id,
              securityLabel: "INTERNAL",
              details: {
                attempts: accountLockout.attempts + 1,
              },
            },
          });
          
          return null;
        }

        

        await resetFailedLoginAttempts(email);

        

        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
          },
        });

        

        if (user.passwordExpiresAt && user.passwordExpiresAt < new Date()) {
          

          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "auth.password_expired",
              resource: "user",
              resourceId: user.id,
              securityLabel: "INTERNAL",
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.legacyRole || "USER",
          department: user.department,
          securityClearance: user.securityClearance,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
};
