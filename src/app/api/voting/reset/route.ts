import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  // 1. Verify admin token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 401 });
  }

  if (!decoded.admin) {
    return NextResponse.json({ ok: false, error: "Forbidden: admin only" }, { status: 403 });
  }

  // 2. Parse body
  let body: { eventId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { eventId } = body;
  if (!eventId) {
    return NextResponse.json({ ok: false, error: "Missing eventId" }, { status: 400 });
  }

  try {
    const stateRef = adminDb.doc(`events/${eventId}/state/current`);

    // Reset to idle � never deletes votes (data is permanent)
    await stateRef.set({
      status: "idle",
      activePerformanceId: null,
      votingStartedAt: null,
      votingEndsAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, message: "Stage reset to idle. Votes are preserved." });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /voting/reset]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
