import { z } from "zod";

// ── App Config ────────────────────────────────────────────────────────────────
export const appConfigSchema = z.object({
  festName: z.string().min(2).max(80),
  activeEventId: z.string().min(1).max(64),
  allowedEmailDomains: z.array(z.string().min(1)).min(1).max(10),
  blockPlusAddressing: z.boolean(),
  requireStudentId: z.boolean(),
  studentIdPattern: z.string().min(1).max(200).nullable(),
  registrationOpen: z.boolean(),
});

export type AppConfigInput = z.infer<typeof appConfigSchema>;

// ── Department ────────────────────────────────────────────────────────────────
export const departmentSchema = z.object({
  name: z.string().min(2).max(60),
  shortName: z.string().min(1).max(12),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #3B4CCA"),
  order: z.number().int().min(0),
  isActive: z.boolean(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

// ── Category ──────────────────────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(2).max(60),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().min(0).max(300),
  order: z.number().int().min(0),
  isActive: z.boolean(),
  includeInOverall: z.boolean(),
  overallWeight: z.number().min(0).max(10),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ── Event ─────────────────────────────────────────────────────────────────────
export const festEventSchema = z.object({
  name: z.string().min(2).max(100),
  year: z.number().int().min(2000).max(2100),
  isTest: z.boolean(),
  status: z.enum(["setup", "live", "completed"]),
  defaultVotingDurationSeconds: z.number().int().min(10).max(600),
  resultsLocked: z.boolean(),
});

export type FestEventInput = z.infer<typeof festEventSchema>;

// ── Performance ───────────────────────────────────────────────────────────────
export const performanceSchema = z.object({
  departmentId: z.string().min(1).max(64),
  categoryId: z.string().min(1).max(64),
  name: z.string().min(2).max(100),
  description: z.string().min(0).max(500).nullable(),
  order: z.number().int().min(0).max(1000),
  status: z.enum(["scheduled", "live", "completed"]),
  votingStartedAt: z.null(),
  votingEndsAt: z.null(),
});

export type PerformanceInput = z.infer<typeof performanceSchema>;

// ── Registration form ─────────────────────────────────────────────────────────
export const registerFormSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters").max(80),
    email: z.string().email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    studentId: z.string().optional(),
    departmentId: z.string().nullable().optional(),
    registerNumber: z.string().optional(),
    departmentCode: z.string().optional(),
    department: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterFormInput = z.infer<typeof registerFormSchema>;

// ── Login form ────────────────────────────────────────────────────────────────
export const loginFormSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginFormInput = z.infer<typeof loginFormSchema>;

// ── Forgot password form ──────────────────────────────────────────────────────
export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

// ── Student ID normalization ──────────────────────────────────────────────────
export const studentIdSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[A-Z0-9-]{3,30}$/, "Student ID must be 3–30 characters (A–Z, 0–9, -)");

// ── Admin grant/revoke ────────────────────────────────────────────────────────
export const adminActionSchema = z.object({
  email: z.string().email(),
  action: z.enum(["grant", "revoke"]),
});

export type AdminActionInput = z.infer<typeof adminActionSchema>;

// ── Voting state ──────────────────────────────────────────────────────────────
export const votingStateSchema = z.object({
  status: z.enum(["idle", "open", "closed"]),
  activePerformanceId: z.string().min(1).max(64).nullable(),
  votingEndsAt: z.null(), // Phase 1 only creates idle state
});
