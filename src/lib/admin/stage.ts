/**
 * Stage voting control functions � Phase 2
 * All writes go through server-side API routes (Admin SDK) for transaction safety and aggregation.
 */

async function callVotingApi(
  path: string,
  body: Record<string, unknown>,
  idToken: string
): Promise<{ ok: boolean; error?: string; [key: string]: unknown }> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error ?? `API ${path} returned error`);
  return data;
}

/**
 * Starts live voting for a given performance with a designated countdown duration.
 * Transactional on the server � rejects if another performance is already active.
 */
export async function startPerformanceVoting(
  eventId: string,
  performanceId: string,
  durationSeconds: number,
  idToken: string
): Promise<void> {
  await callVotingApi("/api/voting/start", { eventId, performanceId, durationSeconds }, idToken);
}

/**
 * Extends the currently active voting window by additional seconds.
 */
export async function extendPerformanceVoting(
  eventId: string,
  additionalSeconds: number,
  idToken: string
): Promise<void> {
  await callVotingApi("/api/voting/extend", { eventId, additionalSeconds }, idToken);
}

/**
 * Stops live voting, closes the voting window, and permanently finalizes the vote tally.
 * Computes all aggregates server-side (rating1Count�rating5Count, averageRating, percentageScore).
 */
export async function stopPerformanceVoting(
  eventId: string,
  performanceId: string,
  idToken: string
): Promise<{ totalVotes: number; averageRating: number; percentageScore: number }> {
  const data = await callVotingApi("/api/voting/stop", { eventId, performanceId }, idToken);
  const agg = data.aggregates as { totalVotes: number; averageRating: number; percentageScore: number };
  return agg ?? { totalVotes: 0, averageRating: 0, percentageScore: 0 };
}

/**
 * Resets stage state back to idle. Does NOT delete any vote documents.
 */
export async function resetStageState(eventId: string, idToken: string): Promise<void> {
  await callVotingApi("/api/voting/reset", { eventId }, idToken);
}
