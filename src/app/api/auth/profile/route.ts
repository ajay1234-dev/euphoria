import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized: Missing authentication token" }, { status: 401 });
  }

  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token, true);
  } catch (err: unknown) {
    console.error("[API Profile] Token verification failed:", err);
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 401 });
  }

  const uid = decodedToken.uid;

  try {
    // 1. Check students/{uid}
    const studentSnap = await adminDb.collection("students").doc(uid).get();
    if (studentSnap.exists) {
      const data = studentSnap.data();
      return NextResponse.json({
        ok: true,
        exists: true,
        profile: {
          ...data,
          registeredAt: data?.registeredAt?.toDate?.()?.toISOString() || null,
          updatedAt: data?.updatedAt?.toDate?.()?.toISOString() || null,
        },
      });
    }

    // 2. Check users/{uid}
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (userSnap.exists) {
      const uData = userSnap.data();
      return NextResponse.json({
        ok: true,
        exists: true,
        profile: {
          uid: uData?.uid || uid,
          name: uData?.fullName || uData?.name || "",
          email: uData?.email || decodedToken.email || "",
          registerNumber: uData?.registerNumber || uData?.studentId || "",
          year: uData?.year || 1,
          departmentCode: uData?.departmentCode || "",
          department: uData?.department || "",
          section: uData?.section || "A",
          role: uData?.role || "student",
          registrationStatus: uData?.registrationStatus || "registered",
          registeredAt: uData?.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: uData?.updatedAt?.toDate?.()?.toISOString() || null,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      exists: false,
      profile: null,
    });
  } catch (err: unknown) {
    console.error("[API Profile Error]:", err);
    return NextResponse.json({
      ok: false,
      error: "Failed to resolve student profile",
      details: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
