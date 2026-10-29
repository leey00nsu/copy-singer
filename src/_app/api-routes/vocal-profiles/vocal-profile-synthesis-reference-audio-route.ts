import { withApiAdmission } from "@/_app/api-routes/admission";
import { canReadGuestResource } from "@/entities/guest-analysis/index.server";
import { getVocalProfileSynthesisReference } from "@/entities/vocal-profile/index.server";
import { getAnalysisActor, unauthorizedResponse } from "@/features/authentication/index.server";
import { proxyPrivateAudio } from "@/shared/media/index.server";

async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getAnalysisActor(request);
  if (!actor) return unauthorizedResponse();
  if (actor.guest && !(await canReadGuestResource(actor.userId, { profileId: (await context.params).id })))
    return Response.json({ reasonCode: "PROFILE_NOT_FOUND" }, { status: 404 });
  const reference = await getVocalProfileSynthesisReference(actor.userId, (await context.params).id);
  if (!reference) {
    return Response.json(
      {
        error: {
          code: "VOCAL_PROFILE_SYNTHESIS_REFERENCE_NOT_FOUND",
          message: "재생할 AI 믹싱 레퍼런스를 찾을 수 없어요.",
        },
      },
      { status: 404 },
    );
  }
  const response = await proxyPrivateAudio({
    request,
    externalUrl: reference.externalUrl,
    mimeType: reference.mimeType,
    fileName: `vocal-profile-${reference.profileId}-synthesis-reference.wav`,
  });
  return (
    response ??
    Response.json(
      {
        error: {
          code: "VOCAL_PROFILE_SYNTHESIS_REFERENCE_UNAVAILABLE",
          message: "AI 믹싱 레퍼런스를 불러오지 못했어요.",
        },
      },
      { status: 502 },
    )
  );
}

export const GET = withApiAdmission(handleGET, { allowGuest: true });
