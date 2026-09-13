import { isIP } from "node:net";
import { positiveInteger } from "../runtime/limits";

export class AdmissionError extends Error {
  constructor(
    readonly code: string,
    readonly status: 429 | 503,
    readonly retryAfter = 10,
  ) {
    super(code);
  }
}

export class TokenBuckets {
  private buckets = new Map<string, { tokens: number; updated: number }>();
  constructor(
    private readonly maxEntries = 10_000,
    private readonly now = Date.now,
  ) {}
  take(key: string, perMinute: number, burst: number) {
    const now = this.now();
    if (!this.buckets.has(key) && this.buckets.size >= this.maxEntries) {
      for (const [id, value] of this.buckets) if (now - value.updated > 600_000) this.buckets.delete(id);
      if (this.buckets.size >= this.maxEntries) throw new AdmissionError("LIMITER_CAPACITY", 503);
    }
    const bucket = this.buckets.get(key) ?? { tokens: burst, updated: now };
    bucket.tokens = Math.min(burst, bucket.tokens + (Math.max(0, now - bucket.updated) * perMinute) / 60_000);
    bucket.updated = now;
    this.buckets.set(key, bucket);
    if (bucket.tokens < 1)
      throw new AdmissionError("RATE_LIMITED", 429, Math.max(1, Math.ceil(((1 - bucket.tokens) * 60) / perMinute)));
    bucket.tokens -= 1;
  }
}

export class UploadSlots {
  private users = new Set<string>();
  acquire(userId: string) {
    if (this.users.has(userId)) throw new AdmissionError("UPLOAD_ALREADY_ACTIVE", 429);
    if (this.users.size >= positiveInteger("UPLOAD_CONCURRENCY", 2, 20))
      throw new AdmissionError("UPLOAD_CAPACITY", 503);
    this.users.add(userId);
    return () => {
      this.users.delete(userId);
    };
  }
}

export function trustedClientIp(headers: Headers) {
  if (process.env.TRUST_PROXY_CLIENT_IP !== "true") return null;
  const name = process.env.TRUSTED_CLIENT_IP_HEADER?.trim();
  if (!name) throw new Error("TRUSTED_CLIENT_IP_HEADER is required when trusting ingress client IP.");
  const value = headers.get(name)?.trim();
  return value && isIP(value) ? value : null;
}

export const requestBuckets = new TokenBuckets();
export const uploadSlots = new UploadSlots();

export function requestPolicy(path: string, method: string) {
  if (/\/audio$|\/reference$|\/synthesis-reference$/.test(path)) return { group: "audio", rate: 240, burst: 60 };
  if (method === "POST" && /mixing-jobs|vocal-profiles/.test(path)) return { group: "submission", rate: 6, burst: 3 };
  if (path.startsWith("/api/admin/") && !["GET", "HEAD"].includes(method))
    return { group: "admin-write", rate: 10, burst: 3 };
  if (path.startsWith("/api/recommendations")) return { group: "recommendation", rate: 30, burst: 10 };
  return { group: "read", rate: 180, burst: 60 };
}

export function admissionResponse(error: AdmissionError) {
  return Response.json(
    {
      error: { code: error.code, message: "요청이 많아요. 잠시 후 다시 시도해 주세요.", retryable: true },
      reasonCode: error.code,
      retryable: true,
    },
    { status: error.status, headers: { "Retry-After": String(error.retryAfter), "Cache-Control": "no-store" } },
  );
}
