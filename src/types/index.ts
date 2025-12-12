import { 
  UserRole, 
  VisitStatus,
  VisitPurpose,
  DataCategory,
  VisitorAction, 
  AccessAction,
  SecurityLevel,
  AuthMethod
} from "@prisma/client";

export type { 
  UserRole, 
  VisitStatus,
  VisitPurpose,
  DataCategory,
  VisitorAction, 
  AccessAction,
  SecurityLevel,
  AuthMethod
};

// Legacy export for backward compatibility
export type VisitorStatus = VisitStatus;

export interface User {
  id: string;
  email: string;
  name: string | null;
  department: string;
  role: UserRole;
  securityClearance: SecurityLevel;
  passwordHash: string | null;
  mfaSecret: string | null;
  mfaEnabled: boolean;
  preferredAuthMethod: AuthMethod;
  sessionVersion: number;
  emailVerified: Date | null;
  image: string | null;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
}

export interface WebAuthnDevice {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports: string[];
  deviceName: string | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface Visitor {
  id: string;
  // Personal info
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  company: string;
  
  // Visit details
  purpose: VisitPurpose;
  hostId: string;
  
  // Security classification
  securityLabel: SecurityLevel;
  dataCategory: DataCategory;
  
  // Visit timing
  scheduledDate: Date;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualCheckIn: Date | null;
  actualCheckOut: Date | null;
  
  // Status with state machine
  status: VisitStatus;
  approvalDate: Date | null;
  approvedById: string | null;
  
  // Documents (encrypted storage reference)
  documentId: string | null;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface VisitorLog {
  id: string;
  visitorId: string;
  userId: string | null;
  action: VisitorAction;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AccessLog {
  id: string;
  visitorId: string | null;
  userId: string | null;
  action: AccessAction;
  location: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  conditions: Record<string, unknown> | null;
  enabled: boolean;
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

// NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      department?: string;
      securityClearance?: SecurityLevel;
      sessionVersion?: number;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
    department?: string;
    securityClearance?: SecurityLevel;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    department?: string;
    securityClearance?: SecurityLevel;
    sessionVersion?: number;
  }
}
