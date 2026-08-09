export const runtime = "nodejs";

import { RecommendationError } from "@/entities/recommendation";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { getRecommendationRun, recommendationSynthesisAudio } from "@/features/create-recommendation/index.server";

export async function GET(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const { id, itemId } = await context.params;
  try {
    await getRecommendationRun(id, session.user.id);
    const upstream = await recommendationSynthesisAudio(id, itemId, request.headers.get("Range"));
    const headers = new Headers();
    for (const name of ["Content-Type", "Content-Length", "Content-Range", "Accept-Ranges", "Content-Disposition"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    if (error instanceof RecommendationError) {
      return Response.json(
        { error: { code: error.code, message: error.message, retryable: error.retryable } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "SYNTHESIS_UPSTREAM_FAILED", message: "합성 결과를 불러오지 못했습니다.", retryable: true } },
      { status: 502 },
    );
  }
}
