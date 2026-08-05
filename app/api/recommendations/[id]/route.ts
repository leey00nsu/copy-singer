import { RecommendationError } from "@/lib/recommendation/contract";
import { deleteRecommendationRun, getRecommendationRun } from "@/lib/recommendation/server";

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

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return Response.json(await getRecommendationRun((await context.params).id));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return Response.json(await deleteRecommendationRun((await context.params).id));
  } catch (error) {
    return errorResponse(error);
  }
}
