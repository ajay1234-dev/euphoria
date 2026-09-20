/**
 * Official College Department Definitions & Verification Utilities
 *
 * College Email Domains:
 *  - @student.msec.edu.in
 *  - @msec.edu.in
 *
 * Register Number Format:
 *  12 Digits in local part of email: [Prefix: 6 digits][Dept Code: 3 digits][Roll: 3 digits]
 *  Positions 7-9 (1-indexed, i.e., index 6 to 9 zero-indexed): Department Code
 *
 * Department Mapping:
 *  103 -> CIVIL (Civil Engineering)
 *  104 -> CSE   (Computer Science and Engineering)
 *  105 -> EEE   (Electrical and Electronics Engineering)
 *  106 -> ECE   (Electronics and Communication Engineering)
 *  205 -> IT    (Information Technology)
 *  243 -> AIDS  (Artificial Intelligence and Data Science)
 *  114 -> MECH  (Mechanical Engineering)
 */

export interface OfficialDepartment {
  code: string;
  shortCode: "CIVIL" | "CSE" | "EEE" | "ECE" | "IT" | "AIDS" | "MECH";
  name: string;
  color: string;
  order: number;
  description: string;
  gradient: string;
}

export const OFFICIAL_DEPARTMENT_CODES = [
  "103",
  "104",
  "105",
  "106",
  "205",
  "243",
  "114",
] as const;

export type DepartmentCode = (typeof OFFICIAL_DEPARTMENT_CODES)[number];

export const OFFICIAL_DEPARTMENTS: Record<DepartmentCode, OfficialDepartment> = {
  "103": {
    code: "103",
    shortCode: "CIVIL",
    name: "Civil Engineering",
    color: "#0284C7",
    order: 1,
    description: "Structural, Infrastructure & Environmental Engineering",
    gradient: "from-sky-500 to-blue-600",
  },
  "104": {
    code: "104",
    shortCode: "CSE",
    name: "Computer Science and Engineering",
    color: "#7C3AED",
    order: 2,
    description: "Algorithms, Systems, Computing & Software Architecture",
    gradient: "from-purple-600 to-indigo-600",
  },
  "105": {
    code: "105",
    shortCode: "EEE",
    name: "Electrical and Electronics Engineering",
    color: "#D97706",
    order: 3,
    description: "Power Systems, Renewable Energy, Grid & Smart Circuits",
    gradient: "from-amber-500 to-yellow-600",
  },
  "106": {
    code: "106",
    shortCode: "ECE",
    name: "Electronics and Communication Engineering",
    color: "#2563EB",
    order: 4,
    description: "Signals, VLSI, Embedded Systems, IoT & Telecommunications",
    gradient: "from-blue-600 to-cyan-600",
  },
  "205": {
    code: "205",
    shortCode: "IT",
    name: "Information Technology",
    color: "#0D9488",
    order: 5,
    description: "Cloud Computing, Information Security & Web Architectures",
    gradient: "from-teal-500 to-emerald-600",
  },
  "243": {
    code: "243",
    shortCode: "AIDS",
    name: "Artificial Intelligence and Data Science",
    color: "#EC4899",
    order: 6,
    description: "Machine Learning, Deep Neural Networks & Big Data",
    gradient: "from-pink-500 to-rose-600",
  },
  "114": {
    code: "114",
    shortCode: "MECH",
    name: "Mechanical Engineering",
    color: "#EA580C",
    order: 7,
    description: "Robotics, Thermal Dynamics, CAD/CAM & Automobile Systems",
    gradient: "from-orange-500 to-red-600",
  },
};

export const DEPARTMENT_MAP: Record<string, string> = {
  "103": "Civil Engineering",
  "104": "Computer Science and Engineering",
  "105": "Electrical and Electronics Engineering",
  "106": "Electronics and Communication Engineering",
  "205": "Information Technology",
  "243": "Artificial Intelligence and Data Science",
  "114": "Mechanical Engineering",
};

export const OFFICIAL_DEPARTMENTS_LIST: OfficialDepartment[] = Object.values(
  OFFICIAL_DEPARTMENTS
).sort((a, b) => a.order - b.order);

/**
 * Official College Student Email Regex
 * Matches emails on @msec.edu.in or @student.msec.edu.in containing a 12-digit register number.
 * Examples:
 *  - 311523205004@msec.edu.in
 *  - 311523205004@student.msec.edu.in
 *  - prabhakar.311523205004@student.msec.edu.in
 *  - 311523205004.prabhakar@msec.edu.in
 */
export const COLLEGE_EMAIL_DOMAIN_REGEX = /@(student\.)?msec\.edu\.in$/i;

/**
 * Checks if domain belongs to official college domains.
 */
export function isCollegeEmailDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  return d === "student.msec.edu.in" || d === "msec.edu.in";
}

/**
 * Extract 12-digit register number from email local-part.
 * Examples:
 *  - '311523205004@msec.edu.in' -> '311523205004'
 *  - 'prabhakar.311523205004@student.msec.edu.in' -> '311523205004'
 *  - '311523205004.arun@msec.edu.in' -> '311523205004'
 */
export function extractRegisterNumber(email: string): string | null {
  if (!email || !email.includes("@")) return null;
  const clean = email.trim().toLowerCase();
  const [local, domain] = clean.split("@");
  if (!domain || !isCollegeEmailDomain(domain)) return null;

  // Search for an exact 12-digit sequence in the local part
  const match = local.match(/(?:^|\D)(\d{12})(?:\D|$)/);
  if (!match) return null;
  return match[1];
}

/**
 * Validate that an email is an official college Google email containing a 12-digit register number.
 */
export function isValidCollegeEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const reg = extractRegisterNumber(email);
  return !!reg && isValidRegisterNumber(reg);
}

/**
 * Extracts a clean Student Name from Google identity metadata:
 * - Extracts alphabetic name parts from Google displayName (excluding the 12-digit reg number)
 * - Or extracts alphabetic name parts from the email local-part (e.g. 'prabhakar' from 'prabhakar.311523205004@...')
 * - Never returns a raw 12-digit register number as the name.
 */
export function extractStudentNameFromIdentity(
  email: string,
  displayName?: string | null
): string {
  const regNo = extractRegisterNumber(email) || "";

  // 1. Try extracting name from displayName if it contains letters
  if (displayName && /[a-zA-Z]/.test(displayName)) {
    let cleaned = displayName;
    if (regNo) {
      cleaned = cleaned.replace(new RegExp(regNo, "g"), "");
    }
    // Strip punctuation and numbers
    cleaned = cleaned.replace(/[\d_()\-#@.,/]/g, " ").trim();
    cleaned = cleaned.replace(/\s+/g, " ");
    if (cleaned.length >= 2) {
      return toTitleCase(cleaned);
    }
  }

  // 2. Try extracting from email local-part if it contains letters
  if (email && email.includes("@")) {
    const local = email.split("@")[0];
    let namePart = local;
    if (regNo) {
      namePart = namePart.replace(new RegExp(regNo, "g"), "");
    }
    namePart = namePart.replace(/[\d._\-+]/g, " ").trim();
    namePart = namePart.replace(/\s+/g, " ");
    if (namePart.length >= 2) {
      return toTitleCase(namePart);
    }
  }

  // 3. Fallback: if only digits were found, return empty string so user fills in their real name
  return "";
}

function toTitleCase(str: string): string {
  return str
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Extract department code from register number or email.
 * Positions 7-9 (1-indexed: 7th, 8th, 9th character -> substring(6, 9))
 * Example: '311523205004' -> '205'
 */
export function extractDepartmentCode(regOrEmail: string): string | null {
  if (!regOrEmail) return null;
  let reg = regOrEmail.trim();
  if (reg.includes("@")) {
    const extracted = extractRegisterNumber(reg);
    if (!extracted) return null;
    reg = extracted;
  }
  if (!/^\d{12}$/.test(reg)) return null;

  return reg.substring(6, 9);
}

/**
 * Lookup official department by 3-digit code
 */
export function getDepartmentFromCode(code: string | null | undefined): OfficialDepartment | null {
  if (!code) return null;
  if (code in OFFICIAL_DEPARTMENTS) {
    return OFFICIAL_DEPARTMENTS[code as DepartmentCode];
  }
  return null;
}

/**
 * Find department code by shortCode or Department ID
 */
export function findCodeByShortName(shortCode: string): string | null {
  const upper = shortCode.trim().toUpperCase();
  for (const dept of OFFICIAL_DEPARTMENTS_LIST) {
    if (dept.shortCode === upper) return dept.code;
  }
  return null;
}

export interface DepartmentValidationResult {
  isValid: boolean;
  isCollegeFormat: boolean;
  registerNumber: string | null;
  departmentCode: string | null;
  department: OfficialDepartment | null;
  error?: string;
}

/**
 * Complete validation of email and department synchronization.
 */
export function validateDepartmentFromEmail(
  email: string,
  selectedDepartmentIdOrCode?: string | null
): DepartmentValidationResult {
  const regNumber = extractRegisterNumber(email);
  if (!regNumber) {
    return {
      isValid: false,
      isCollegeFormat: false,
      registerNumber: null,
      departmentCode: null,
      department: null,
      error: "Email must contain your 12-digit college register number.",
    };
  }

  const deptCode = extractDepartmentCode(regNumber);
  if (!deptCode) {
    return {
      isValid: false,
      isCollegeFormat: true,
      registerNumber: regNumber,
      departmentCode: null,
      department: null,
      error: "Could not extract department code from register number.",
    };
  }

  const dept = getDepartmentFromCode(deptCode);
  if (!dept) {
    return {
      isValid: false,
      isCollegeFormat: true,
      registerNumber: regNumber,
      departmentCode: deptCode,
      department: null,
      error: `Department code '${deptCode}' is not an authorized college department.`,
    };
  }

  // If a department was selected in the UI, verify match
  if (selectedDepartmentIdOrCode) {
    const sel = selectedDepartmentIdOrCode.trim();
    const matchesCode = sel === dept.code;
    const matchesShort = sel.toUpperCase() === dept.shortCode;
    const matchesId = sel.toLowerCase().includes(dept.shortCode.toLowerCase()) || sel.includes(dept.code);

    if (!matchesCode && !matchesShort && !matchesId) {
      return {
        isValid: false,
        isCollegeFormat: true,
        registerNumber: regNumber,
        departmentCode: deptCode,
        department: dept,
        error: `Department mismatch: Your register number (${regNumber}) belongs to ${dept.shortCode} (${dept.name}), but you selected a different department.`,
      };
    }
  }

  return {
    isValid: true,
    isCollegeFormat: true,
    registerNumber: regNumber,
    departmentCode: deptCode,
    department: dept,
  };
}

/**
 * Validates a 12-digit register number string.
 */
export function isValidRegisterNumber(registerNumber: string | null | undefined): boolean {
  if (!registerNumber) return false;
  return /^[0-9]{12}$/.test(registerNumber.trim());
}

export interface CollegeIdentityValidation {
  isValid: boolean;
  email: string | null;
  registerNumber: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  department: OfficialDepartment | null;
  error?: string;
}

/**
 * Reusable utility to validate college identity directly from an authenticated Google email.
 */
export function validateCollegeIdentity(email: string | null | undefined): CollegeIdentityValidation {
  if (!email) {
    return {
      isValid: false,
      email: null,
      registerNumber: null,
      departmentCode: null,
      departmentName: null,
      department: null,
      error: "No email address provided.",
    };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidCollegeEmail(cleanEmail)) {
    return {
      isValid: false,
      email: cleanEmail,
      registerNumber: null,
      departmentCode: null,
      departmentName: null,
      department: null,
      error: "Please sign in using your official MSEC college Google account.",
    };
  }

  const registerNumber = extractRegisterNumber(cleanEmail);
  if (!registerNumber || !isValidRegisterNumber(registerNumber)) {
    return {
      isValid: false,
      email: cleanEmail,
      registerNumber,
      departmentCode: null,
      departmentName: null,
      department: null,
      error: "Your college account does not contain a valid 12-digit register number.",
    };
  }

  const departmentCode = extractDepartmentCode(registerNumber);
  if (!departmentCode) {
    return {
      isValid: false,
      email: cleanEmail,
      registerNumber,
      departmentCode: null,
      departmentName: null,
      department: null,
      error: "Could not extract department code from register number.",
    };
  }

  const department = getDepartmentFromCode(departmentCode);
  if (!department) {
    return {
      isValid: false,
      email: cleanEmail,
      registerNumber,
      departmentCode,
      departmentName: null,
      department: null,
      error: "Your register number could not be associated with a valid department. Please contact the event administrator.",
    };
  }

  return {
    isValid: true,
    email: cleanEmail,
    registerNumber,
    departmentCode,
    departmentName: department.name,
    department,
  };
}

/**
 * Year Selection Options (Only 2nd, 3rd, and 4th years are eligible)
 */
export const YEAR_OPTIONS = [
  { value: 2, label: "Second Year" },
  { value: 3, label: "Third Year" },
  { value: 4, label: "Fourth Year" },
] as const;

export type YearValue = (typeof YEAR_OPTIONS)[number]["value"];

export function formatYearLabel(year: number | string | undefined | null): string {
  const y = Number(year);
  switch (y) {
    case 1:
      return "First Year";
    case 2:
      return "Second Year";
    case 3:
      return "Third Year";
    case 4:
      return "Fourth Year";
    default:
      return year ? `Year ${year}` : "—";
  }
}

/**
 * Default Sections (configurable in app settings - sections A and B alone)
 */
export const DEFAULT_SECTIONS = ["A", "B"] as const;

export interface StudentRegistrationInput {
  name?: string;
  year?: number | string;
  section?: string;
  departmentCode?: string;
  registerNumber?: string;
}

/**
 * Validates student-provided registration fields before Firestore commit.
 */
export function validateStudentRegistrationData(data: StudentRegistrationInput): {
  isValid: boolean;
  error?: string;
} {
  const name = (data.name ?? "").trim();
  if (!name || name.length < 2) {
    return { isValid: false, error: "Please enter your name." };
  }

  const yearNum = Number(data.year);
  if (!yearNum || ![2, 3, 4].includes(yearNum)) {
    return { isValid: false, error: "Please select your year (2nd, 3rd, or 4th Year)." };
  }

  const section = (data.section ?? "").trim().toUpperCase();
  if (!section || !["A", "B"].includes(section)) {
    return { isValid: false, error: "Please select your section (Section A or B)." };
  }

  if (data.departmentCode && data.registerNumber) {
    const extractedCode = extractDepartmentCode(data.registerNumber);
    if (extractedCode !== data.departmentCode) {
      return {
        isValid: false,
        error: "Department code mismatch with register number.",
      };
    }
  }

  return { isValid: true };
}

