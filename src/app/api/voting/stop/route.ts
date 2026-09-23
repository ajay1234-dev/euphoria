import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

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
  let body: { eventId?: string; performanceId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  const { eventId, performanceId } = body;
  if (!eventId || !performanceId) {
    return NextResponse.json({ ok: false, error: "Missing eventId or performanceId" }, { status: 400 });
  }

  try {
    const stateRef = adminDb.doc(`events/${eventId}/state/current`);
    const perfRef = adminDb.doc(`events/${eventId}/performances/${performanceId}`);
    const votesCol = adminDb.collection(`events/${eventId}/performances/${performanceId}/votes`);

    // 3. Immediately close voting state
    await stateRef.set({
      status: "closed",
      activePerformanceId: null,
      votingEndsAt: null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 4. Tally votes � query individual rating counts (1-5)
    let totalVotes = 0;
    let rating1Count = 0, rating2Count = 0, rating3Count = 0, rating4Count = 0, rating5Count = 0;

    try {
      const allVotes = await votesCol.get();
      totalVotes = allVotes.size;

      for (const doc of allVotes.docs) {
        const r = doc.data().rating as number;
        if (r === 1) rating1Count++;
        else if (r === 2) rating2Count++;
        else if (r === 3) rating3Count++;
        else if (r === 4) rating4Count++;
        else if (r === 5) rating5Count++;
      }
    } catch (err) {
      console.warn("[voting/stop] Vote tally error:", err);
    }

    const totalRatingPoints = rating1Count * 1 + rating2Count * 2 + rating3Count * 3 + rating4Count * 4 + rating5Count * 5;
    const averageRating = totalVotes > 0 ? totalRatingPoints / totalVotes : 0;
    const percentageScore = (averageRating / 5) * 100;

    // 5. Write aggregates to performance doc (permanently finalized)
    await perfRef.update({
      status: "completed",
      totalVotes,
      rating1Count,
      rating2Count,
      rating3Count,
      rating4Count,
      rating5Count,
      totalRatingPoints,
      averageRating: parseFloat(averageRating.toFixed(4)),
      percentageScore: parseFloat(percentageScore.toFixed(4)),
      finalizedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      message: "Voting stopped and results finalized",
      aggregates: { totalVotes, rating1Count, rating2Count, rating3Count, rating4Count, rating5Count, totalRatingPoints, averageRating, percentageScore },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API /voting/stop]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
