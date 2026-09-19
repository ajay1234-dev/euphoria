import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from "firebase/firestore";
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
} from "@/types/firestore";

function makeConverter<T extends object>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      return data;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): T {
      return snapshot.data(options) as T;
    },
  };
}

export const appConfigConverter = makeConverter<AppConfig>();
export const userProfileConverter = makeConverter<UserProfile>();
export const studentProfileConverter = makeConverter<StudentProfile>();
export const studentIdClaimConverter = makeConverter<StudentIdClaim>();
export const departmentConverter = makeConverter<Department>();
export const categoryConverter = makeConverter<Category>();
export const festEventConverter = makeConverter<FestEvent>();
export const performanceConverter = makeConverter<Performance>();
export const votingStateConverter = makeConverter<VotingState>();
export const adminDirectoryEntryConverter = makeConverter<AdminDirectoryEntry>();
