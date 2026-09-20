import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  OFFICIAL_DEPARTMENTS,
  type DepartmentCode,
  extractDepartmentCode,
} from "@/config/departments";

export async function POST(req: NextRequest) {
  // 1. Verify Authorization Header
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized: Missing authentication token" }, { status: 401 });
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token, true);
  } catch (err: unknown) {
    console.error("[API Register] Token verification failed:", err);
    return NextResponse.json({ ok: false, error: "Invalid or expired session. Please sign in again." }, { status: 401 });
  }

  const callerUid = decodedToken.uid;
  const callerEmail = (decodedToken.email ?? "").toLowerCase();

  // 2. Parse and validate body
  let body: {
    name?: string;
    registerNumber?: string;
    year?: number | string;
    departmentCode?: string;
    department?: string;
    section?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload" }, { status: 400 });
  }

  const trimmedName = (body.name ?? "").trim();
  const registerNumber = (body.registerNumber ?? "").trim();
  const yearNum = Number(body.year);
  const section = (body.section ?? "").trim().toUpperCase();
  let departmentCode = (body.departmentCode ?? "").trim();
  let departmentName = (body.department ?? "").trim();

  // Validation
  if (!trimmedName || trimmedName.length < 2) {
    return NextResponse.json({ ok: false, error: "Please enter a valid full name (at least 2 characters)." }, { status: 400 });
  }

  if (!/^\d{12}$/.test(registerNumber)) {
    return NextResponse.json({ ok: false, error: "Register number must be exactly 12 digits." }, { status: 400 });
  }

  if (!departmentCode) {
    departmentCode = extractDepartmentCode(registerNumber) || "";
  }

  const deptMeta = OFFICIAL_DEPARTMENTS[departmentCode as DepartmentCode];
  if (!deptMeta) {
    return NextResponse.json({ ok: false, error: `Invalid college department code (${departmentCode}).` }, { status: 400 });
  }

  if (!departmentName) {
    departmentName = deptMeta.name;
  }

  if (![1, 2, 3, 4].includes(yearNum)) {
    return NextResponse.json({ ok: false, error: "Please select a valid academic year (1, 2, 3, or 4)." }, { status: 400 });
  }

  if (!["A", "B", "C", "D"].includes(section)) {
    return NextResponse.json({ ok: false, error: "Please select a valid section." }, { status: 400 });
  }

  try {
    // 3. Check App Config: Is Registration Open?
    const configDoc = await adminDb.collection("config").doc("app").get();
    if (configDoc.exists) {
      const configData = configDoc.data();
      if (configData?.registrationOpen === false) {
        return NextResponse.json({
          ok: false,
          error: "Festival registration is currently closed by administrators.",
        }, { status: 403 });
      }
    }

    // 4. Check Claim Collision: Is this registerNumber already claimed by someone else?
    const claimDoc = await adminDb.collection("studentIdClaims").doc(registerNumber).get();
    if (claimDoc.exists) {
      const claimData = claimDoc.data();
      if (claimData?.uid && claimData.uid !== callerUid) {
        return NextResponse.json({
          ok: false,
          error: `College register number ${registerNumber} has already been registered with another student account.`,
        }, { status: 409 });
      }
    }

    // 5. Check if student doc already exists
    const existingStudent = await adminDb.collection("students").doc(callerUid).get();
    if (existingStudent.exists) {
      return NextResponse.json({
        ok: true,
        alreadyRegistered: true,
        profile: existingStudent.data(),
      });
    }

    // 6. Atomic Batch Write (students + users + studentIdClaims)
    const batch = adminDb.batch();

    // 6a. Primary Student Document: students/{uid}
    const studentDocRef = adminDb.collection("students").doc(callerUid);
    const studentData = {
      uid: callerUid,
      name: trimmedName,
      email: callerEmail,
      registerNumber,
      year: yearNum,
      departmentCode,
      department: departmentName,
      section,
      role: "student",
      registrationStatus: "registered",
      registeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(studentDocRef, studentData);

    // 6b. Compatibility Mirror: users/{uid}
    const userDocRef = adminDb.collection("users").doc(callerUid);
    const domain = callerEmail.split("@")[1]?.toLowerCase() || "msec.edu.in";
    const shortCode = deptMeta.shortCode;
    const userProfileData = {
      uid: callerUid,
      fullName: trimmedName,
      name: trimmedName,
      email: callerEmail,
      emailDomain: domain,
      studentId: registerNumber,
      registerNumber,
      year: yearNum,
      section,
      departmentCode,
      department: shortCode,
      departmentId: `dept-${shortCode.toLowerCase()}`,
      role: "student",
      registrationStatus: "registered",
      emailVerified: true,
      verifiedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      registeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(userDocRef, userProfileData);

    // 6c. Unique Claim: studentIdClaims/{registerNumber}
    const claimDocRef = adminDb.collection("studentIdClaims").doc(registerNumber);
    batch.set(claimDocRef, {
      uid: callerUid,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({
      ok: true,
      success: true,
      profile: {
        ...studentData,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error("[API Register Error]:", err);
    return NextResponse.json({
      ok: false,
      error: "Server failed to record registration. Please try again.",
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
