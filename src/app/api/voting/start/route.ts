import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  let body: { eventId?: string; performanceId?: string; durationSeconds?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { eventId, performanceId, durationSeconds } = body;
  if (!eventId || !performanceId || !durationSeconds || durationSeconds < 10 || durationSeconds > 3600) {
    return NextResponse.json({ ok: false, error: "Missing or invalid fields: eventId, performanceId, durationSeconds (10-3600)" }, { status: 400 });
  }

  try {
    const stateRef = adminDb.doc(`events/${eventId}/state/current`);
    const perfRef = adminDb.doc(`events/${eventId}/performances/${performanceId}`);

    const now = new Date();
    const nowMs = now.getTime();
    const endsAtMs = nowMs + durationSeconds * 1000;
    const votingStartedAt = Timestamp.fromMillis(nowMs);
    const votingEndsAt = Timestamp.fromMillis(endsAtMs);

    await adminDb.runTransaction(async (tx) => {
      const stateSnap = await tx.get(stateRef);
      if (stateSnap.exists) {
        const current = stateSnap.data();
        if (current?.status === "open") {
          // If the previous performance voting window has already ended, auto-close it
          const previousEndsAt = current.votingEndsAt?.toMillis?.() ?? 0;
          if (previousEndsAt > 0 && previousEndsAt <= nowMs) {
            const prevPerfId = current.activePerformanceId;
            if (prevPerfId && prevPerfId !== performanceId) {
              const prevPerfRef = adminDb.doc(`events/${eventId}/performances/${prevPerfId}`);
              tx.set(prevPerfRef, { status: "completed", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            }
          } else if (current.activePerformanceId && current.activePerformanceId !== performanceId) {
            throw new Error(`Another performance is already live on stage. Please stop it first.`);
          }
        }
      }

      const perfSnap = await tx.get(perfRef);
      if (!perfSnap.exists) {
        throw new Error(`Performance ${performanceId} not found`);
      }

      tx.set(stateRef, {
        status: "open",
        activePerformanceId: performanceId,
        durationSeconds,
        startedAtMs: nowMs,
        endsAtMs,
        votingStartedAt,
        votingEndsAt,
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(perfRef, {
        status: "live",
        votingStartedAt,
        votingEndsAt,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({
      ok: true,
      message: "Voting started",
      durationSeconds,
      endsAtMs,
      serverTime: nowMs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /voting/start]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
