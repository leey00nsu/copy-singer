export const runtime = "nodejs";

import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";
import { analysisJobPayload, getVocalProfileAnalysisJob } from "@/lib/vocal-profile/analysis-queue";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const { id } = await context.params;
  const result = await getVocalProfileAnalysisJob(session.user.id, id).catch(() => null);
  if (!result) {
    return Response.json(
      { reasonCode: "ANALYSIS_JOB_NOT_FOUND", detail: "Vocal profile analysis job was not found.", retryable: false },
      { status: 404 },
    );
  }
  return Response.json({ ...analysisJobPayload(result.job), profile: result.profile });
}
