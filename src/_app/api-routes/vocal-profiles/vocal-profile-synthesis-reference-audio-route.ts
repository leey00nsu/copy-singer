import { getVocalProfileSynthesisReference } from "@/entities/vocal-profile/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { proxyPrivateAudio } from "@/shared/media/index.server";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const reference = await getVocalProfileSynthesisReference(session.user.id, (await context.params).id);
  if (!reference) {
    return Response.json(
      {
        error: {
          code: "VOCAL_PROFILE_SYNTHESIS_REFERENCE_NOT_FOUND",
          message: "재생할 AI 믹싱 레퍼런스를 찾을 수 없습니다.",
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
          message: "AI 믹싱 레퍼런스 저장소에 연결하지 못했습니다.",
        },
      },
      { status: 502 },
    )
  );
}
