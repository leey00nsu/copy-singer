export const runtime = "nodejs";

import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";
import { RecommendationError } from "@/lib/recommendation/contract";
import { deleteRecommendationRun, getRecommendationRun } from "@/lib/recommendation/server";
import { reconcileRecommendationSyntheses } from "@/lib/recommendation/synthesis";

function errorResponse(error: unknown) {
  if (error instanceof RecommendationError) {
    return Response.json(
      { error: { code: error.code, message: error.message, retryable: error.retryable } },
      { status: error.status },
    );
  }
  return Response.json(
    { error: { code: "RECOMMENDATION_SAVE_FAILED", message: "Recommendation request failed.", retryable: true } },
    { status: 500 },
  );
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  try {
    const id = (await context.params).id;
    await getRecommendationRun(id, session.user.id);
    await reconcileRecommendationSyntheses(id);
    return Response.json(await getRecommendationRun(id, session.user.id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  try {
    return Response.json(await deleteRecommendationRun((await context.params).id, session.user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
