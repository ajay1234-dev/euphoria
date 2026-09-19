import {
  getDocs,
  query,
  limit,
  type Timestamp,
} from "firebase/firestore";
import { studentsRef, usersRef } from "@/lib/firebase/paths";
import { STUDENTS_PAGE_SIZE } from "@/config/constants";
import { getDepartmentFromCode, formatYearLabel } from "@/config/departments";
import { toCsv, downloadCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/utils";

export interface AdminStudentRecord {
  uid: string;
  name: string;
  email: string;
  registerNumber: string;
  year: number;
  departmentCode: string;
  department: string;
  section: string;
  role: string;
  registrationStatus: "registered" | "pending" | string;
  registeredAt: Timestamp | null;
}

export interface StudentFilterOptions {
  statusFilter?: "all" | "registered" | "pending";
  departmentFilter?: string; // "all", "other", or department code (e.g. "104")
  yearFilter?: string; // "all", "1", "2", "3", "4"
  sectionFilter?: string; // "all", "A", "B", "C", etc.
  searchQuery?: string; // name, email, or register number
  page?: number;
  pageSize?: number;
}

export interface StudentStats {
  total: number;
  verified: number;
  unverified: number;
  registered: number;
  pending: number;
  departmentCounts: Record<string, number>;
  yearCounts: Record<number, number>;
  sectionCounts: Record<string, number>;
}

function normalizeRecord(data: Record<string, any>, uid: string): AdminStudentRecord {
  const regNo = data.registerNumber || data.studentId || "—";
  let deptCode = data.departmentCode || "";
  if (!deptCode && regNo && regNo.length === 12) {
    deptCode = regNo.substring(6, 9);
  }
  const officialDept = getDepartmentFromCode(deptCode);
  const deptName = data.department || officialDept?.name || data.departmentId || "General";

  const rawYear = data.year;
  let yearNum = 1;
  if (typeof rawYear === "number" && rawYear >= 1 && rawYear <= 4) {
    yearNum = rawYear;
  } else if (typeof rawYear === "string") {
    const parsed = parseInt(rawYear, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) yearNum = parsed;
  }

  const rawStatus = data.registrationStatus;
  const status = rawStatus || (data.emailVerified ? "registered" : "pending");

  return {
    uid,
    name: data.name || data.fullName || "Student",
    email: data.email || "",
    registerNumber: regNo,
    year: yearNum,
    departmentCode: deptCode,
    department: deptName,
    section: (data.section || "A").toUpperCase(),
    role: data.role || "student",
    registrationStatus: status,
    registeredAt: data.registeredAt || data.createdAt || data.updatedAt || null,
  };
}

/**
 * Fetch all students from both students collection and users fallback,
 * deduplicated by UID.
 */
async function fetchAllStudents(): Promise<AdminStudentRecord[]> {
  const [studentsSnap, usersSnap] = await Promise.all([
    getDocs(query(studentsRef(), limit(2000))),
    getDocs(query(usersRef(), limit(2000))),
  ]);

  const map = new Map<string, AdminStudentRecord>();

  // Primary: students collection
  studentsSnap.docs.forEach((doc) => {
    map.set(doc.id, normalizeRecord(doc.data(), doc.id));
  });

  // Secondary: users collection (add if not already present)
  usersSnap.docs.forEach((doc) => {
    if (!map.has(doc.id)) {
      map.set(doc.id, normalizeRecord(doc.data(), doc.id));
    }
  });

  return Array.from(map.values());
}

/** Get total counts and distributions for students */
export async function getStudentStats(): Promise<StudentStats> {
  const list = await fetchAllStudents();

  const departmentCounts: Record<string, number> = {};
  const yearCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const sectionCounts: Record<string, number> = {};

  let registered = 0;
  let pending = 0;

  for (const s of list) {
    if (s.registrationStatus === "registered") {
      registered++;
    } else {
      pending++;
    }

    // Department distribution
    const deptKey = s.departmentCode || "Other";
    departmentCounts[deptKey] = (departmentCounts[deptKey] || 0) + 1;

    // Year distribution
    if (s.year >= 1 && s.year <= 4) {
      yearCounts[s.year] = (yearCounts[s.year] || 0) + 1;
    }

    // Section distribution
    if (s.section) {
      const secKey = s.section.toUpperCase();
      sectionCounts[secKey] = (sectionCounts[secKey] || 0) + 1;
    }
  }

  return {
    total: list.length,
    verified: registered,
    unverified: pending,
    registered,
    pending,
    departmentCounts,
    yearCounts,
    sectionCounts,
  };
}

export interface PaginatedStudentsResult {
  students: AdminStudentRecord[];
  totalMatches: number;
  hasMore: boolean;
}

/**
 * Fetch and filter students with multi-attribute criteria:
 * Department, Year, Section, Status, and Search (Name, Email, Register No).
 */
export async function getStudentsPage(
  options: StudentFilterOptions = {}
): Promise<PaginatedStudentsResult> {
  const allStudents = await fetchAllStudents();

  // Sort descending by registeredAt
  allStudents.sort((a, b) => {
    const timeA = a.registeredAt?.toMillis() ?? 0;
    const timeB = b.registeredAt?.toMillis() ?? 0;
    return timeB - timeA;
  });

  const search = options.searchQuery?.trim().toLowerCase();

  const filtered = allStudents.filter((s) => {
    // 1. Search Query (Name, Email, Register No)
    if (search) {
      const matchName = s.name.toLowerCase().includes(search);
      const matchEmail = s.email.toLowerCase().includes(search);
      const matchReg = s.registerNumber.toLowerCase().includes(search);
      if (!matchName && !matchEmail && !matchReg) {
        return false;
      }
    }

    // 2. Status Filter
    if (options.statusFilter && options.statusFilter !== "all") {
      if (s.registrationStatus !== options.statusFilter) {
        return false;
      }
    }

    // 3. Department Filter
    if (options.departmentFilter && options.departmentFilter !== "all") {
      if (options.departmentFilter === "other") {
        if (s.departmentCode && getDepartmentFromCode(s.departmentCode)) {
          return false;
        }
      } else {
        if (s.departmentCode !== options.departmentFilter) {
          return false;
        }
      }
    }

    // 4. Year Filter
    if (options.yearFilter && options.yearFilter !== "all") {
      if (s.year !== Number(options.yearFilter)) {
        return false;
      }
    }

    // 5. Section Filter
    if (options.sectionFilter && options.sectionFilter !== "all") {
      if (s.section.toUpperCase() !== options.sectionFilter.toUpperCase()) {
        return false;
      }
    }

    return true;
  });

  const page = options.page || 1;
  const pageSize = options.pageSize || STUDENTS_PAGE_SIZE;
  const startIndex = (page - 1) * pageSize;
  const paginatedList = filtered.slice(startIndex, startIndex + pageSize);
  const hasMore = startIndex + pageSize < filtered.length;

  return {
    students: paginatedList,
    totalMatches: filtered.length,
    hasMore,
  };
}

/**
 * Export all students to CSV with full profile metadata:
 * Name, Register Number, Year, Department Code, Department, Section, Email, Status, Registered At
 */
export async function exportStudentsCsv(): Promise<void> {
  const allStudents = await fetchAllStudents();

  // Sort descending by registeredAt
  allStudents.sort((a, b) => {
    const timeA = a.registeredAt?.toMillis() ?? 0;
    const timeB = b.registeredAt?.toMillis() ?? 0;
    return timeB - timeA;
  });

  const columns = [
    "Full Name",
    "Register Number",
    "Year",
    "Department Code",
    "Department",
    "Section",
    "Email",
    "Registration Status",
    "Registered At",
  ];

  const csvRows = allStudents.map((s) => ({
    "Full Name": s.name,
    "Register Number": s.registerNumber,
    Year: formatYearLabel(s.year),
    "Department Code": s.departmentCode || "—",
    Department: s.department,
    Section: s.section,
    Email: s.email,
    "Registration Status": s.registrationStatus === "registered" ? "Registered" : "Pending",
    "Registered At": s.registeredAt ? formatDateTime(s.registeredAt) : "—",
  }));

  const csvContent = toCsv(csvRows, columns);
  const filename = `students-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(filename, csvContent);
}
