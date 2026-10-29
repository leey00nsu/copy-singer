import { withApiAdmission } from "@/_app/api-routes/admission";
import { claimGuestAnalysis, GuestAnalysisError } from "@/entities/guest-analysis/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { requireSameOrigin } from "./guest-analysis-route";

async function handlePOST(request: Request) {
  if (!requireSameOrigin(request)) return Response.json({ reasonCode: "INVALID_ORIGIN" }, { status: 403 });
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  try {
    return Response.json(await claimGuestAnalysis(request.headers, session.user.id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof GuestAnalysisError)
      return Response.json({ reasonCode: error.code, retryable: false }, { status: error.status });
    return Response.json({ reasonCode: "GUEST_RESULT_SAVE_FAILED", retryable: true }, { status: 503 });
  }
}

export const POST = withApiAdmission(handlePOST);
