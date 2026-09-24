import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { DEPT_CODE_TO_SHORT_CODE } from "@/config/departments";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Verify Authorization Header
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Please sign in with your college account to rate stage acts." },
      { status: 401 }
    );
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Session expired. Please sign in again." },
      { status: 401 }
    );
  }

  const callerUid = decoded.uid;
  const isStaffUser = Boolean(decoded.admin || decoded.organizer);

  // 2. Parse body
  let body: { eventId?: string; performanceId?: string; rating?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request payload" }, { status: 400 });
  }

  const { eventId, performanceId, rating } = body;
  const ratingNum = Number(rating);

  if (!eventId || !performanceId || !ratingNum || ratingNum < 1 || ratingNum > 5 || !Number.isInteger(ratingNum)) {
    return NextResponse.json(
      { ok: false, error: "Please select a valid rating between 1 and 5 stars." },
      { status: 400 }
    );
  }

  try {
    // 3. Check Live Stage State
    const stateDoc = await adminDb.doc(`events/${eventId}/state/current`).get();
    if (!stateDoc.exists || stateDoc.data()?.status !== "open") {
      return NextResponse.json(
        { ok: false, error: "Rating window is currently closed for this act." },
        { status: 400 }
      );
    }

    const stateData = stateDoc.data();
    if (stateData?.activePerformanceId !== performanceId) {
      return NextResponse.json(
        { ok: false, error: "This act is no longer the active performance on stage." },
        { status: 400 }
      );
    }

    // 4. Department Fairness Protection Check (Non-staff voters)
    if (!isStaffUser) {
      const perfDoc = await adminDb.doc(`events/${eventId}/performances/${performanceId}`).get();
      if (!perfDoc.exists) {
        return NextResponse.json({ ok: false, error: "Performance not found." }, { status: 404 });
      }
      const perfData = perfDoc.data();
      const perfDeptId = (perfData?.departmentId || "").toLowerCase().trim();

      // Fetch student data — check students/ first (most users), then users/
      let studentDeptId = "";

      const studentDoc = await adminDb.doc(`students/${callerUid}`).get();
      if (studentDoc.exists) {
        const s = studentDoc.data();
        const numericCode = (s?.departmentCode || "").trim(); // e.g. "103"
        // Convert numeric code → short name → dept-civil format
        // DEPT_CODE_TO_SHORT_CODE: "103" → "CIVIL"
        const shortName = DEPT_CODE_TO_SHORT_CODE[numericCode]; // "CIVIL"
        studentDeptId = shortName ? `dept-${shortName.toLowerCase()}` : ""; // "dept-civil"
      } else {
        const userDoc = await adminDb.doc(`users/${callerUid}`).get();
        if (userDoc.exists) {
          const u = userDoc.data();
          // users/ stores departmentId already normalized as dept-civil
          const rawDeptId = (u?.departmentId || "").toLowerCase().trim();
          // Also check numeric code fallback
          const numericCode = (u?.departmentCode || "").trim();
          const shortName = numericCode ? DEPT_CODE_TO_SHORT_CODE[numericCode] : null;
          studentDeptId = rawDeptId || (shortName ? `dept-${shortName.toLowerCase()}` : "");
        }
      }

      // Block only on exact match (student dept === performance dept)
      const isBlocked = Boolean(studentDeptId && perfDeptId && studentDeptId === perfDeptId);

      if (isBlocked) {
        return NextResponse.json(
          { ok: false, error: "Festival fairness rule: You cannot rate your own department's performance. Voting is locked for your department to keep scores 100% fair. Cheer loud from the crowd!" },
          { status: 403 }
        );
      }
    }

    // 5. Atomic Write to Votes Subcollection
    const voteRef = adminDb.doc(`events/${eventId}/performances/${performanceId}/votes/${callerUid}`);
    await voteRef.set(
      {
        studentUid: callerUid,
        rating: ratingNum,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      success: true,
      rating: ratingNum,
      message: "Rating submitted successfully",
    });
  } catch (err: unknown) {
    console.error("[API Vote Error]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to record vote. Please try again." },
      { status: 500 }
    );
  }
}
