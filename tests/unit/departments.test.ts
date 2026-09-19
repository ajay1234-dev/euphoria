import { describe, it, expect } from "vitest";
import {
  extractRegisterNumber,
  extractDepartmentCode,
  getDepartmentFromCode,
  validateDepartmentFromEmail,
  isValidCollegeEmail,
  OFFICIAL_DEPARTMENTS,
  OFFICIAL_DEPARTMENT_CODES,
  DEPARTMENT_MAP,
  isValidRegisterNumber,
  validateCollegeIdentity,
  validateStudentRegistrationData,
  formatYearLabel,
} from "../../src/config/departments";

describe("College Department Verification & Code Extraction", () => {
  describe("isValidCollegeEmail", () => {
    it("accepts valid 12-digit student emails on @msec.edu.in", () => {
      expect(isValidCollegeEmail("311523205004@msec.edu.in")).toBe(true);
      expect(isValidCollegeEmail("243115205006@msec.edu.in")).toBe(true);
      expect(isValidCollegeEmail("311523205004@student.msec.edu.in")).toBe(true);
    });

    it("rejects personal email domains (@gmail.com, @yahoo.com)", () => {
      expect(isValidCollegeEmail("student@gmail.com")).toBe(false);
      expect(isValidCollegeEmail("student@yahoo.com")).toBe(false);
    });

    it("rejects non-12-digit handles on @msec.edu.in", () => {
      expect(isValidCollegeEmail("abc@msec.edu.in")).toBe(false);
      expect(isValidCollegeEmail("31152320500@msec.edu.in")).toBe(false); // 11 digits
      expect(isValidCollegeEmail("3115232050045@msec.edu.in")).toBe(false); // 13 digits
      expect(isValidCollegeEmail("")).toBe(false);
      expect(isValidCollegeEmail(null)).toBe(false);
    });
  });

  it("should correctly map all 7 official department codes", () => {
    expect(OFFICIAL_DEPARTMENT_CODES).toHaveLength(7);
    expect(OFFICIAL_DEPARTMENTS["103"].shortCode).toBe("CIVIL");
    expect(OFFICIAL_DEPARTMENTS["104"].shortCode).toBe("CSE");
    expect(OFFICIAL_DEPARTMENTS["105"].shortCode).toBe("EEE");
    expect(OFFICIAL_DEPARTMENTS["106"].shortCode).toBe("ECE");
    expect(OFFICIAL_DEPARTMENTS["205"].shortCode).toBe("IT");
    expect(OFFICIAL_DEPARTMENTS["243"].shortCode).toBe("AIDS");
    expect(OFFICIAL_DEPARTMENTS["114"].shortCode).toBe("MECH");
  });

  describe("extractRegisterNumber", () => {
    it("extracts 12-digit register number from official student email", () => {
      const email = "311523205004@student.msec.edu.in";
      expect(extractRegisterNumber(email)).toBe("311523205004");
    });

    it("extracts 12-digit register number from msec.edu.in email", () => {
      const email = "311523104012@msec.edu.in";
      expect(extractRegisterNumber(email)).toBe("311523104012");
    });

    it("returns null for non-12-digit email local part", () => {
      expect(extractRegisterNumber("priya.s@student.msec.edu.in")).toBeNull();
      expect(extractRegisterNumber("12345@student.msec.edu.in")).toBeNull();
      expect(extractRegisterNumber("invalid-email")).toBeNull();
    });
  });

  describe("extractDepartmentCode", () => {
    it("extracts positions 7-9 (1-indexed) as department code", () => {
      // 3 1 1 5 2 3 [2 0 5] 0 0 4 -> indices 6, 7, 8
      expect(extractDepartmentCode("311523205004")).toBe("205");
      expect(extractDepartmentCode("311523103001")).toBe("103");
      expect(extractDepartmentCode("311523104050")).toBe("104");
      expect(extractDepartmentCode("311523105022")).toBe("105");
      expect(extractDepartmentCode("311523106033")).toBe("106");
      expect(extractDepartmentCode("311523243044")).toBe("243");
      expect(extractDepartmentCode("311523114055")).toBe("114");
    });

    it("extracts department code directly from full email", () => {
      expect(extractDepartmentCode("311523205004@student.msec.edu.in")).toBe("205");
    });
  });

  describe("getDepartmentFromCode", () => {
    it("returns the correct department metadata", () => {
      const itDept = getDepartmentFromCode("205");
      expect(itDept).not.toBeNull();
      expect(itDept?.shortCode).toBe("IT");
      expect(itDept?.name).toBe("Information Technology");

      const aidsDept = getDepartmentFromCode("243");
      expect(aidsDept?.shortCode).toBe("AIDS");

      const invalid = getDepartmentFromCode("999");
      expect(invalid).toBeNull();
    });
  });

  describe("validateDepartmentFromEmail", () => {
    it("successfully validates valid student email with IT department code", () => {
      const res = validateDepartmentFromEmail("311523205004@student.msec.edu.in");
      expect(res.isValid).toBe(true);
      expect(res.registerNumber).toBe("311523205004");
      expect(res.departmentCode).toBe("205");
      expect(res.department?.shortCode).toBe("IT");
    });

    it("successfully validates when selected department matches", () => {
      const res = validateDepartmentFromEmail(
        "311523205004@student.msec.edu.in",
        "dept-it"
      );
      expect(res.isValid).toBe(true);
    });

    it("rejects when student selected a conflicting department", () => {
      const res = validateDepartmentFromEmail(
        "311523205004@student.msec.edu.in",
        "dept-cse" // Mismatch!
      );
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("Department mismatch");
    });

    it("rejects email with unrecognized department code", () => {
      const res = validateDepartmentFromEmail("311523999004@student.msec.edu.in");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("not an authorized college department");
    });

    it("rejects email without 12-digit register number", () => {
      const res = validateDepartmentFromEmail("staff@msec.edu.in");
      expect(res.isValid).toBe(false);
      expect(res.error).toContain("12-digit");
    });
  });

  describe("DEPARTMENT_MAP and Helper Utilities", () => {
    it("validates 12-digit register number format", () => {
      expect(isValidRegisterNumber("311523205004")).toBe(true);
      expect(isValidRegisterNumber("311523104050")).toBe(true);
      expect(isValidRegisterNumber("12345678901")).toBe(false); // 11
      expect(isValidRegisterNumber("1234567890123")).toBe(false); // 13
      expect(isValidRegisterNumber("31152320500A")).toBe(false); // letter
    });

    it("maps all 7 official department codes correctly in DEPARTMENT_MAP", () => {
      expect(DEPARTMENT_MAP["103"]).toBe("Civil Engineering");
      expect(DEPARTMENT_MAP["104"]).toBe("Computer Science and Engineering");
      expect(DEPARTMENT_MAP["105"]).toBe("Electrical and Electronics Engineering");
      expect(DEPARTMENT_MAP["106"]).toBe("Electronics and Communication Engineering");
      expect(DEPARTMENT_MAP["205"]).toBe("Information Technology");
      expect(DEPARTMENT_MAP["243"]).toBe("Artificial Intelligence and Data Science");
      expect(DEPARTMENT_MAP["114"]).toBe("Mechanical Engineering");
    });

    it("formats year label accurately", () => {
      expect(formatYearLabel(1)).toBe("First Year");
      expect(formatYearLabel(2)).toBe("Second Year");
      expect(formatYearLabel(3)).toBe("Third Year");
      expect(formatYearLabel(4)).toBe("Fourth Year");
      expect(formatYearLabel("3")).toBe("Third Year");
      expect(formatYearLabel(5)).toBe("Year 5");
    });

    it("validates student registration form data", () => {
      const valid = validateStudentRegistrationData({
        name: "Ada Lovelace",
        year: 2,
        section: "A",
        availableSections: ["A", "B", "C"],
      });
      expect(valid.isValid).toBe(true);

      const shortName = validateStudentRegistrationData({
        name: "A",
        year: 2,
        section: "A",
        availableSections: ["A", "B", "C"],
      });
      expect(shortName.isValid).toBe(false);

      const invalidYear = validateStudentRegistrationData({
        name: "Ada Lovelace",
        year: 5 as any,
        section: "A",
        availableSections: ["A", "B", "C"],
      });
      expect(invalidYear.isValid).toBe(false);

      const invalidSec = validateStudentRegistrationData({
        name: "Ada Lovelace",
        year: 2,
        section: "Z",
        availableSections: ["A", "B", "C"],
      });
      expect(invalidSec.isValid).toBe(false);
    });

    it("validates college identity via validateCollegeIdentity", () => {
      const validStudent = validateCollegeIdentity("311523205004@student.msec.edu.in");
      expect(validStudent.isValid).toBe(true);
      expect(validStudent.extractedRegisterNumber).toBe("311523205004");
      expect(validStudent.extractedCode).toBe("205");
      expect(validStudent.department?.shortCode).toBe("IT");

      const invalidDomain = validateCollegeIdentity("311523205004@gmail.com");
      expect(invalidDomain.isValid).toBe(false);

      const unknownCode = validateCollegeIdentity("311523999004@msec.edu.in");
      expect(unknownCode.isValid).toBe(false);
      expect(unknownCode.errorMessage).toContain("unrecognized");
    });
  });
});
