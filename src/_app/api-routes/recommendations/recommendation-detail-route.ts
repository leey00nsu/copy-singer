import { withApiAdmission } from "@/_app/api-routes/admission";
import { RecommendationError } from "@/entities/recommendation/index.model";
import { getAnalysisResourceActor, unauthorizedResponse } from "@/features/authentication/index.server";
import { getRecommendationResult } from "@/features/create-recommendation/index.server";
import { resourceIdSchema } from "@/shared/api";

function errorResponse(error: unknown) {
  if (error instanceof RecommendationError) {
    return Response.json(
      { error: { code: error.code, message: error.message, retryable: error.retryable } },
      { status: error.status },
    );
  }
  return Response.json(
    {
      error: { code: "RECOMMENDATION_CALCULATION_FAILED", message: "Recommendation request failed.", retryable: true },
    },
    { status: 500 },
  );
}

async function handleGET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const parsedId = resourceIdSchema.safeParse((await context.params).id);
    if (!parsedId.success) {
      throw new RecommendationError("RECOMMENDATION_NOT_FOUND", "Recommendation was not found.", { status: 404 });
    }
    const actor = await getAnalysisResourceActor(request, { profileId: parsedId.data });
    if (!actor) return unauthorizedResponse();
    return Response.json(await getRecommendationResult(parsedId.data, actor.userId), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = withApiAdmission(handleGET, { allowGuest: true });
