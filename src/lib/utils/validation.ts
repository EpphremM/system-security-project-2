import { z } from "zod";
import validator from "validator";

// Enums for validation
const VisitPurposeEnum = z.enum([
  "MEETING",
  "INTERVIEW",
  "DELIVERY",
  "MAINTENANCE",
  "TOUR",
  "TRAINING",
  "CONSULTATION",
  "OTHER",
]);

const VisitStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CHECKED_IN",
  "CHECKED_OUT",
  "CANCELLED",
  "EXPIRED",
  "NO_SHOW",
]);

const SecurityLevelEnum = z.enum([
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
  "TOP_SECRET",
]);

const DataCategoryEnum = z.enum([
  "GENERAL",
  "PERSONAL",
  "CONFIDENTIAL",
  "RESTRICTED",
  "CLASSIFIED",
]);

// Visitor validation schemas
export const visitorSchema = z.object({
  // Personal info
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .refine((val) => validator.isMobilePhone(val, "any"), {
      message: "Invalid phone number",
    }),
  company: z.string().min(1, "Company is required").max(200),
  
  // Visit details
  purpose: VisitPurposeEnum,
  hostId: z.string().uuid("Invalid host ID"),
  
  // Security classification
  securityLabel: SecurityLevelEnum.default("PUBLIC"),
  dataCategory: DataCategoryEnum.default("GENERAL"),
  
  // Visit timing
  scheduledDate: z.date(),
  scheduledStart: z.date(),
  scheduledEnd: z.date().refine(
    (end) => {
      // This will be validated against scheduledStart in the application
      return true;
    },
    { message: "End time must be after start time" }
  ),
  
  // Documents (optional)
  documentId: z.string().optional(),
}).refine(
  (data) => data.scheduledEnd > data.scheduledStart,
  {
    message: "End time must be after start time",
    path: ["scheduledEnd"],
  }
);

export const visitorUpdateSchema = visitorSchema.partial().extend({
  id: z.string().uuid("Invalid visitor ID"),
});

export const visitorApprovalSchema = z.object({
  visitorId: z.string().uuid("Invalid visitor ID"),
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(1000).optional(),
});

export const checkInSchema = z.object({
  visitorId: z.string().uuid("Invalid visitor ID"),
  location: z.string().optional(),
});

export const checkOutSchema = z.object({
  visitorId: z.string().uuid("Invalid visitor ID"),
  notes: z.string().max(500).optional(),
});

// User validation schemas
export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required").max(100).optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "SECURITY", "RECEPTIONIST", "USER"]),
  department: z.string().min(1, "Department is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Export enum types
export type VisitPurpose = z.infer<typeof VisitPurposeEnum>;
export type VisitStatus = z.infer<typeof VisitStatusEnum>;
export type SecurityLevel = z.infer<typeof SecurityLevelEnum>;
export type DataCategory = z.infer<typeof DataCategoryEnum>;
