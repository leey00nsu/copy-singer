import { withApiAdmission } from "@/_app/api-routes/admission";
import { canReadGuestResource } from "@/entities/guest-analysis/index.server";
import { analysisJobPayload, getVocalProfileAnalysisJob } from "@/features/analyze-vocal-profile/index.server";
import { getAnalysisActor, unauthorizedResponse } from "@/features/authentication/index.server";
import { resourceIdSchema } from "@/shared/api";

async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getAnalysisActor(request);
  if (!actor) return unauthorizedResponse();
  const id = resourceIdSchema.safeParse((await context.params).id);
  if (actor.guest && (!id.success || !(await canReadGuestResource(actor.userId, { jobId: id.data }))))
    return Response.json({ reasonCode: "ANALYSIS_JOB_NOT_FOUND" }, { status: 404 });
  const result = id.success ? await getVocalProfileAnalysisJob(actor.userId, id.data).catch(() => null) : null;
  if (!result) {
    return Response.json(
      { reasonCode: "ANALYSIS_JOB_NOT_FOUND", detail: "Vocal profile analysis job was not found.", retryable: false },
      { status: 404 },
    );
  }
  return Response.json({ ...analysisJobPayload(result.job), profile: result.profile });
}

export const GET = withApiAdmission(handleGET, { allowGuest: true });
