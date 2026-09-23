import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

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
  let body: { eventId?: string; additionalSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { eventId, additionalSeconds } = body;
  if (!eventId || !additionalSeconds || additionalSeconds < 10 || additionalSeconds > 300) {
    return NextResponse.json({ ok: false, error: "Missing or invalid fields: eventId, additionalSeconds (10-300)" }, { status: 400 });
  }

  try {
    const stateRef = adminDb.doc(`events/${eventId}/state/current`);

    await adminDb.runTransaction(async (tx) => {
      const stateSnap = await tx.get(stateRef);
      if (!stateSnap.exists) throw new Error("No voting state found");
      const state = stateSnap.data();
      if (state?.status !== "open") throw new Error("No active voting session to extend");

      const activePerformanceId = state.activePerformanceId as string;
      const currentEndsAt = state.votingEndsAt as Timestamp;
      const currentMs = currentEndsAt ? currentEndsAt.toMillis() : Date.now();
      const newEndsAtMs = Math.max(Date.now(), currentMs) + additionalSeconds * 1000;
      const newEndsAt = Timestamp.fromMillis(newEndsAtMs);

      const perfRef = adminDb.doc(`events/${eventId}/performances/${activePerformanceId}`);

      tx.update(stateRef, {
        votingEndsAt: newEndsAt,
        endsAtMs: newEndsAtMs,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.update(perfRef, {
        votingEndsAt: newEndsAt,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ ok: true, message: `Extended by ${additionalSeconds}s` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /voting/extend]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
