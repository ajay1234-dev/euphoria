import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  // 1. Extract Bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized: Missing token" }, { status: 401 });
  }

  // 2. Verify admin identity
  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch (err) {
    console.error("[API Config] Token verification failed:", err);
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 401 });
  }

  const email = decoded.email?.toLowerCase() ?? "";
  const uid = decoded.uid;

  // Verify admin authorization
  let isAuthorizedAdmin = decoded.admin === true || email === "admin@msec.edu.in";

  if (!isAuthorizedAdmin) {
    // Check if recorded in adminDirectory
    try {
      const adminDoc = await adminDb.collection("adminDirectory").doc(uid).get();
      if (adminDoc.exists) {
        isAuthorizedAdmin = true;
      }
    } catch {
      // ignore
    }
  }

  if (!isAuthorizedAdmin) {
    return NextResponse.json({ ok: false, error: "Forbidden: Admin privileges required" }, { status: 403 });
  }

  // If user is authorized but custom claim is missing, auto-grant it
  if (!decoded.admin) {
    try {
      await adminAuth.setCustomUserClaims(uid, { ...decoded, admin: true });
    } catch (err) {
      console.warn("[API Config] Could not auto-grant claim:", err);
    }
  }

  // 3. Parse and sanitize body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (typeof body.eventOpen === "boolean") {
    updateData.eventOpen = body.eventOpen;
  }
  if (typeof body.registrationOpen === "boolean") {
    updateData.registrationOpen = body.registrationOpen;
  }
  if (typeof body.festName === "string" && body.festName.trim()) {
    updateData.festName = body.festName.trim();
  }
  if (typeof body.activeEventId === "string" && body.activeEventId.trim()) {
    updateData.activeEventId = body.activeEventId.trim();
  }
  if (Array.isArray(body.allowedEmailDomains) && body.allowedEmailDomains.length > 0) {
    updateData.allowedEmailDomains = body.allowedEmailDomains;
  }
  if (typeof body.blockPlusAddressing === "boolean") {
    updateData.blockPlusAddressing = body.blockPlusAddressing;
  }
  if (typeof body.requireStudentId === "boolean") {
    updateData.requireStudentId = body.requireStudentId;
  }
  if (body.studentIdPattern !== undefined) {
    updateData.studentIdPattern = body.studentIdPattern === null ? null : String(body.studentIdPattern);
  }
  if (Array.isArray(body.sections) && body.sections.length > 0) {
    updateData.sections = body.sections;
  }

  try {
    const configDocRef = adminDb.collection("config").doc("app");
    await configDocRef.set(updateData, { merge: true });

    return NextResponse.json({
      ok: true,
      message: "Configuration saved successfully",
      updatedFields: Object.keys(updateData),
    });
  } catch (err: unknown) {
    console.error("[API Config] Firestore write failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save configuration" },
      { status: 500 }
    );
  }
}
