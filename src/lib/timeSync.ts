/**
 * Time synchronization utility
 * Uses NTP-like round-trip time estimation to synchronize client device time
 * with the server time, eliminating clock skew across student phones, admin laptops,
 * and auditorium projectors.
 */

let cachedOffset: number = 0;
let hasSynced = false;
let syncPromise: Promise<number> | null = null;

export async function syncServerTime(): Promise<number> {
  if (hasSynced) return cachedOffset;
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const t0 = Date.now();
      const res = await fetch("/api/time", { cache: "no-store" });
      const t1 = Date.now();
      if (!res.ok) return 0;
      const data = await res.json();
      const latency = Math.round((t1 - t0) / 2);
      const serverTime = data.serverTime + latency;
      cachedOffset = serverTime - t1;
      hasSynced = true;
      return cachedOffset;
    } catch {
      return 0;
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

export function getServerOffset(): number {
  return cachedOffset;
}
