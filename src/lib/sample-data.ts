/**
 * Pure sample data for the emulator seed script.
 * No side effects — everything is plain data.
 */

import type {
  AppConfig,
  Department,
  Category,
  FestEvent,
  Performance,
  VotingState,
} from "@/types/firestore";

type WithoutTimestamps<T> = Omit<
  T,
  "createdAt" | "updatedAt" | "verifiedAt" | "addedAt" | "updatedAt"
>;

export const SEED_CONFIG: Omit<AppConfig, "updatedAt"> = {
  festName: "Euphoria 2026",
  activeEventId: "test-event-001",
  allowedEmailDomains: ["student.msec.edu.in", "msec.edu.in", "college.test"],
  blockPlusAddressing: true,
  requireStudentId: false,
  studentIdPattern: null,
  registrationOpen: true,
};

export const SEED_DEPARTMENTS: Array<
  WithoutTimestamps<Department> & { id: string }
> = [
  { id: "dept-civil", name: "Civil Engineering", shortName: "CIVIL", color: "#0284C7", order: 1, isActive: true },
  { id: "dept-cse", name: "Computer Science and Engineering", shortName: "CSE", color: "#7C3AED", order: 2, isActive: true },
  { id: "dept-eee", name: "Electrical and Electronics Engineering", shortName: "EEE", color: "#D97706", order: 3, isActive: true },
  { id: "dept-ece", name: "Electronics and Communication Engineering", shortName: "ECE", color: "#2563EB", order: 4, isActive: true },
  { id: "dept-it", name: "Information Technology", shortName: "IT", color: "#0D9488", order: 5, isActive: true },
  { id: "dept-aids", name: "Artificial Intelligence and Data Science", shortName: "AIDS", color: "#EC4899", order: 6, isActive: true },
  { id: "dept-mech", name: "Mechanical Engineering", shortName: "MECH", color: "#EA580C", order: 7, isActive: true },
  { id: "dept-dance", name: "Dance Club", shortName: "Dance", color: "#8B5CF6", order: 8, isActive: true },
  { id: "dept-music", name: "Music Society", shortName: "Music", color: "#3B4CCA", order: 9, isActive: true },
  { id: "dept-drama", name: "Drama Society", shortName: "Drama", color: "#FF5A5F", order: 10, isActive: true },
];

export const SEED_CATEGORIES: Array<
  WithoutTimestamps<Category> & { id: string }
> = [
  { id: "cat-classical-dance", name: "Classical Dance", slug: "classical-dance", description: "Traditional classical dance forms.", order: 0, isActive: true, includeInOverall: true, overallWeight: 1 },
  { id: "cat-western-dance", name: "Western Dance", slug: "western-dance", description: "Contemporary and hip-hop dance styles.", order: 1, isActive: true, includeInOverall: true, overallWeight: 1 },
  { id: "cat-solo-vocals", name: "Solo Vocals", slug: "solo-vocals", description: "Solo singing performance.", order: 2, isActive: true, includeInOverall: true, overallWeight: 1 },
  { id: "cat-band", name: "Band Performance", slug: "band-performance", description: "Group musical performance.", order: 3, isActive: true, includeInOverall: true, overallWeight: 1 },
  { id: "cat-street-play", name: "Street Play", slug: "street-play", description: "Short street theatre performance.", order: 4, isActive: true, includeInOverall: true, overallWeight: 1 },
  { id: "cat-standup", name: "Stand-Up Comedy", slug: "standup-comedy", description: "Original comedy set.", order: 5, isActive: true, includeInOverall: true, overallWeight: 1 },
  { id: "cat-poetry", name: "Poetry Slam", slug: "poetry-slam", description: "Original spoken-word poetry.", order: 6, isActive: true, includeInOverall: true, overallWeight: 1 },
  { id: "cat-fashion-show", name: "Fashion Show", slug: "fashion-show", description: "Themed fashion runway.", order: 7, isActive: true, includeInOverall: false, overallWeight: 1 },
];

export const SEED_EVENT: Omit<FestEvent, "createdAt" | "updatedAt"> & { id: string } = {
  id: "test-event-001",
  name: "Euphoria 2026 (Rehearsal)",
  year: 2026,
  isTest: true,
  status: "setup",
  defaultVotingDurationSeconds: 60,
  resultsLocked: false,
};

export const SEED_PERFORMANCES: Array<
  WithoutTimestamps<Performance> & { id: string }
> = [
  { id: "perf-001", departmentId: "dept-dance", categoryId: "cat-classical-dance", name: "Bharatanatyam Ensemble", description: "A journey through classical Tamil Nadu traditions.", order: 0, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-002", departmentId: "dept-dance", categoryId: "cat-western-dance", name: "Hip-Hop Showcase", description: null, order: 1, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-003", departmentId: "dept-music", categoryId: "cat-solo-vocals", name: "Aria in the Dark", description: "Original composition.", order: 2, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-004", departmentId: "dept-music", categoryId: "cat-band", name: "Electric Dreams", description: "3-piece rock band.", order: 3, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-005", departmentId: "dept-drama", categoryId: "cat-street-play", name: "The Last Station", description: null, order: 4, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-006", departmentId: "dept-drama", categoryId: "cat-standup", name: "Campus Chronicles", description: "Comedy about college life.", order: 5, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-007", departmentId: "dept-lit", categoryId: "cat-poetry", name: "Voices Unheard", description: null, order: 6, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-008", departmentId: "dept-lit", categoryId: "cat-standup", name: "Between the Lines", description: "Literary comedy.", order: 7, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-009", departmentId: "dept-art", categoryId: "cat-fashion-show", name: "Canvas & Cloth", description: "Wearable art fusion.", order: 8, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-010", departmentId: "dept-photography", categoryId: "cat-street-play", name: "Shutter Stories", description: "Visual storytelling through live performance.", order: 9, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-011", departmentId: "dept-fashion", categoryId: "cat-fashion-show", name: "Euphoria Runway", description: null, order: 10, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
  { id: "perf-012", departmentId: "dept-music", categoryId: "cat-classical-dance", name: "Fusion Beats", description: "Carnatic-jazz fusion.", order: 11, status: "scheduled", votingStartedAt: null, votingEndsAt: null },
];

export const SEED_VOTING_STATE: Omit<VotingState, "updatedAt"> = {
  status: "idle",
  activePerformanceId: null,
  votingEndsAt: null,
};

export const SEED_ADMIN = {
  email: "admin@example.test",
  password: "Admin@1234",
};

export const SEED_STUDENTS = [
  { email: "student1@college.test", password: "Student@1234", fullName: "Alice Kumar", studentId: null, departmentId: "dept-dance" },
  { email: "student2@college.test", password: "Student@1234", fullName: "Bob Sharma", studentId: null, departmentId: "dept-music" },
  { email: "student3@college.test", password: "Student@1234", fullName: "Carol Singh", studentId: null, departmentId: null },
];
