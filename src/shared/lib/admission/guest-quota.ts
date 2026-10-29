import { AdmissionError } from "./limiter";

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1_000;

/** One instance per web process. Reservations remain attached to their original day. */
export class GuestAnalysisQuota {
  private current = { day: -1, used: 0 };

  constructor(private readonly now = Date.now) {}

  private bucket() {
    const day = Math.floor((this.now() + KST_OFFSET_MS) / DAY_MS);
    if (this.current.day !== day) this.current = { day, used: 0 };
    return this.current;
  }

  policy(limit: number) {
    const bucket = this.bucket();
    const resetAt = (bucket.day + 1) * DAY_MS - KST_OFFSET_MS;
    return { available: bucket.used < limit, retryAfter: Math.max(1, Math.ceil((resetAt - this.now()) / 1_000)) };
  }

  reserve(limit: number) {
    const policy = this.policy(limit);
    if (!policy.available) throw new AdmissionError("GUEST_ANALYSIS_DAILY_LIMIT", 429, policy.retryAfter);
    const bucket = this.bucket();
    bucket.used += 1;
    let settled = false;
    return {
      commit() {
        settled = true;
      },
      release() {
        if (!settled) bucket.used -= 1;
        settled = true;
      },
    };
  }
}

// Share Route Handler bundles and development reloads within the same process.
const processState = globalThis as typeof globalThis & { guestAnalysisQuota?: GuestAnalysisQuota };
export const guestAnalysisQuota = processState.guestAnalysisQuota ?? new GuestAnalysisQuota();
processState.guestAnalysisQuota = guestAnalysisQuota;
