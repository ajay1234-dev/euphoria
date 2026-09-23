import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "./client";
import type {
  AppConfig,
  UserProfile,
  StudentProfile,
  StudentIdClaim,
  Department,
  Category,
  FestEvent,
  Performance,
  VotingState,
  AdminDirectoryEntry,
  Vote,
  ProjectionState,
} from "@/types/firestore";
import {
  appConfigConverter,
  userProfileConverter,
  studentProfileConverter,
  studentIdClaimConverter,
  departmentConverter,
  categoryConverter,
  festEventConverter,
  performanceConverter,
  votingStateConverter,
  adminDirectoryEntryConverter,
  voteConverter,
  projectionStateConverter,
} from "./converters";


// ── Singleton document paths ──────────────────────────────────────────────────

export function configAppRef(): DocumentReference<AppConfig> {
  return doc(db, "config", "app").withConverter(appConfigConverter);
}

// ── Student paths (students/{uid}) ───────────────────────────────────────────

export function studentsRef(): CollectionReference<StudentProfile> {
  return collection(db, "students").withConverter(studentProfileConverter);
}

export function studentRef(uid: string): DocumentReference<StudentProfile> {
  return doc(db, "students", uid).withConverter(studentProfileConverter);
}

// ── User paths (users/{uid}) ──────────────────────────────────────────────────

export function usersRef(): CollectionReference<UserProfile> {
  return collection(db, "users").withConverter(userProfileConverter);
}

export function userRef(uid: string): DocumentReference<UserProfile> {
  return doc(db, "users", uid).withConverter(userProfileConverter);
}

// ── Student ID claims ─────────────────────────────────────────────────────────

export function studentIdClaimsRef(): CollectionReference<StudentIdClaim> {
  return collection(db, "studentIdClaims").withConverter(studentIdClaimConverter);
}

export function studentIdClaimRef(
  normalizedId: string
): DocumentReference<StudentIdClaim> {
  return doc(db, "studentIdClaims", normalizedId).withConverter(
    studentIdClaimConverter
  );
}

// ── Admin directory ───────────────────────────────────────────────────────────

export function adminDirectoryRef(): CollectionReference<AdminDirectoryEntry> {
  return collection(db, "adminDirectory").withConverter(
    adminDirectoryEntryConverter
  );
}

export function adminDirectoryEntryRef(
  uid: string
): DocumentReference<AdminDirectoryEntry> {
  return doc(db, "adminDirectory", uid).withConverter(
    adminDirectoryEntryConverter
  );
}

// ── Departments ───────────────────────────────────────────────────────────────

export function departmentsRef(): CollectionReference<Department> {
  return collection(db, "departments").withConverter(departmentConverter);
}

export function departmentRef(id: string): DocumentReference<Department> {
  return doc(db, "departments", id).withConverter(departmentConverter);
}

// ── Categories ────────────────────────────────────────────────────────────────

export function categoriesRef(): CollectionReference<Category> {
  return collection(db, "categories").withConverter(categoryConverter);
}

export function categoryRef(id: string): DocumentReference<Category> {
  return doc(db, "categories", id).withConverter(categoryConverter);
}

// ── Events ────────────────────────────────────────────────────────────────────

export function eventsRef(): CollectionReference<FestEvent> {
  return collection(db, "events").withConverter(festEventConverter);
}

export function eventRef(eventId: string): DocumentReference<FestEvent> {
  return doc(db, "events", eventId).withConverter(festEventConverter);
}

// ── Performances ──────────────────────────────────────────────────────────────

export function performancesRef(
  eventId: string
): CollectionReference<Performance> {
  return collection(db, "events", eventId, "performances").withConverter(
    performanceConverter
  );
}

export function performanceRef(
  eventId: string,
  performanceId: string
): DocumentReference<Performance> {
  return doc(
    db,
    "events",
    eventId,
    "performances",
    performanceId
  ).withConverter(performanceConverter);
}

// ── Voting state ──────────────────────────────────────────────────────────────

export function votingStateRef(eventId: string): DocumentReference<VotingState> {
  return doc(db, "events", eventId, "state", "current").withConverter(
    votingStateConverter
  );
}

// ── Votes subcollection (events/{eventId}/performances/{performanceId}/votes/{uid}) ────

export function votesRef(
  eventId: string,
  performanceId: string
): CollectionReference<Vote> {
  return collection(
    db,
    "events",
    eventId,
    "performances",
    performanceId,
    "votes"
  ).withConverter(voteConverter);
}

export function voteRef(
  eventId: string,
  performanceId: string,
  uid: string
): DocumentReference<Vote> {
  return doc(
    db,
    "events",
    eventId,
    "performances",
    performanceId,
    "votes",
    uid
  ).withConverter(voteConverter);
}

// ── Projection State (events/{eventId}/projection/state) ──────────────────────

export function projectionStateRef(
  eventId: string
): DocumentReference<ProjectionState> {
  return doc(db, "events", eventId, "projection", "state").withConverter(
    projectionStateConverter
  );
}


