import { GUEST_TRIAL_COOKIE, GUEST_TRIAL_COOKIE_SECONDS } from "@/entities/guest-analysis/index.model";
import { createGuestTrial, getGuestTrial } from "@/entities/guest-analysis/index.server";
import { getRequestSession } from "@/features/authentication/index.server";
import { guestAnalysisDailyLimit } from "@/shared/config/index.server";
import {
  AdmissionError,
  admissionResponse,
  guestAnalysisQuota,
  requestBuckets,
  trustedClientIp,
} from "@/shared/lib/admission/index.server";

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  const expected = new URL(process.env.BETTER_AUTH_URL ?? request.url).origin;
  return origin === expected && request.headers.get("Sec-Fetch-Site") !== "cross-site";
}

export async function POST(request: Request) {
  if (!requireSameOrigin(request)) return Response.json({ reasonCode: "INVALID_ORIGIN" }, { status: 403 });
  try {
    const ip = trustedClientIp(request.headers);
    requestBuckets.take(`guest-start:${ip ?? "untrusted-ingress"}`, 6, 3);
    if (await getRequestSession(request)) return Response.json({ status: "member" });
    // Keep the same browser identity even after its result expires or is saved.
    const existing = await getGuestTrial(request.headers);
    if (existing) return Response.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
    const policy = guestAnalysisQuota.policy(guestAnalysisDailyLimit());
    if (!policy.available) throw new AdmissionError("GUEST_ANALYSIS_DAILY_LIMIT", 429, policy.retryAfter);
    const { token } = await createGuestTrial();
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    return Response.json(
      { status: "ready" },
      {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `${GUEST_TRIAL_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${GUEST_TRIAL_COOKIE_SECONDS}${secure}`,
        },
      },
    );
  } catch (error) {
    if (error instanceof AdmissionError) return admissionResponse(error);
    throw error;
  }
}
