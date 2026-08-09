import { analysisJobPayload, getVocalProfileAnalysisJob } from "@/features/analyze-vocal-profile/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { resourceIdSchema } from "@/shared/api";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const id = resourceIdSchema.safeParse((await context.params).id);
  const result = id.success ? await getVocalProfileAnalysisJob(session.user.id, id.data).catch(() => null) : null;
  if (!result) {
    return Response.json(
      { reasonCode: "ANALYSIS_JOB_NOT_FOUND", detail: "Vocal profile analysis job was not found.", retryable: false },
      { status: 404 },
    );
  }
  return Response.json({ ...analysisJobPayload(result.job), profile: result.profile });
}
