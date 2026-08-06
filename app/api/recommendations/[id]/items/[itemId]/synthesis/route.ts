export const runtime = "nodejs";

import { RecommendationError } from "@/lib/recommendation/contract";
import { startRecommendationSynthesis } from "@/lib/recommendation/synthesis";
import { getRecommendationRun } from "@/lib/recommendation/server";
import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";

function errorResponse(error: unknown) {
  if (error instanceof RecommendationError) {
    return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.status });
  }
  return Response.json({ error: { code: "SYNTHESIS_UPSTREAM_FAILED", message: "합성 작업을 시작하지 못했습니다.", retryable: true } }, { status: 500 });
}

export async function POST(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  let retry = false;
  try {
    const body = await request.json().catch(() => ({})) as { retry?: unknown };
    retry = body.retry === true;
  } catch {
    // Empty body starts a new item.
  }
  const { id, itemId } = await context.params;
  try {
    await getRecommendationRun(id, session.user.id);
    return Response.json(await startRecommendationSynthesis(id, itemId, retry), { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
