import { RecommendationError } from "@/entities/recommendation/index.model";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import {
  deleteRecommendationRun,
  getRecommendationRun,
  reconcileRecommendationSyntheses,
} from "@/features/create-recommendation/index.server";
import { resourceIdSchema } from "@/shared/api";

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
    const parsedId = resourceIdSchema.safeParse((await context.params).id);
    if (!parsedId.success) {
      throw new RecommendationError("RECOMMENDATION_NOT_FOUND", "Recommendation was not found.", { status: 404 });
    }
    const id = parsedId.data;
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
    const parsedId = resourceIdSchema.safeParse((await context.params).id);
    if (!parsedId.success) {
      throw new RecommendationError("RECOMMENDATION_NOT_FOUND", "Recommendation was not found.", { status: 404 });
    }
    return Response.json(await deleteRecommendationRun(parsedId.data, session.user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
