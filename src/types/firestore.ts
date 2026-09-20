import type { Timestamp } from "firebase/firestore";

export interface AppConfig {
  festName: string;
  activeEventId: string;
  allowedEmailDomains: string[];
  blockPlusAddressing: boolean;
  requireStudentId: boolean;
  studentIdPattern: string | null;
  registrationOpen: boolean;
  sections?: string[];
  updatedAt: Timestamp;
}

export interface StudentProfile {
  uid: string;
  name: string;
  email: string;
  registerNumber: string;
  year: number; // 1 | 2 | 3 | 4
  departmentCode: string;
  department: string;
  section: string;
  role: "student" | string;
  registrationStatus: "registered" | "pending" | string;
  registeredAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  name?: string;
  email: string;
  emailDomain: string;
  studentId: string | null;
  registerNumber?: string | null;
  year?: number | null;
  section?: string | null;
  departmentCode?: string | null;
  department?: string | null;
  departmentId: string | null;
  role?: "student" | "admin" | string;
  registrationStatus?: "registered" | "pending" | string;
  emailVerified: boolean;
  verifiedAt: Timestamp | null;
  createdAt: Timestamp;
  registeredAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface StudentIdClaim {
  uid: string;
  createdAt: Timestamp;
}

export interface Department {
  name: string;
  shortName: string;
  color: string;
  order: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Category {
  name: string;
  slug: string;
  description: string;
  order: number;
  isActive: boolean;
  includeInOverall: boolean;
  overallWeight: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FestEvent {
  name: string;
  year: number;
  isTest: boolean;
  status: "setup" | "live" | "completed";
  defaultVotingDurationSeconds: number;
  resultsLocked: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PerformanceStatus = "scheduled" | "live" | "completed";

export interface Performance {
  departmentId: string;
  categoryId: string;
  name: string;
  description: string | null;
  order: number;
  status: PerformanceStatus;
  votingStartedAt: Timestamp | null;
  votingEndsAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VotingState {
  status: "idle" | "open" | "closed";
  activePerformanceId: string | null;
  votingEndsAt: Timestamp | null;
  updatedAt: Timestamp;
}

export interface AdminDirectoryEntry {
  email: string;
  addedAt: Timestamp;
  addedBy: string;
}

export interface Vote {
  uid: string;
  studentUid: string;
  rating: number; // 1 to 5
  departmentId?: string | null;
  year?: number | null;
  section?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
