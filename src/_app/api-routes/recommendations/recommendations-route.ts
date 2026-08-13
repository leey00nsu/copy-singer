import { RecommendationError } from "@/entities/recommendation/index.model";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { createRecommendationRequestSchema } from "@/features/create-recommendation/index.model";
import { getRecommendationResult } from "@/features/create-recommendation/index.server";

function errorResponse(error: unknown) {
  if (error instanceof RecommendationError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          ...(Object.keys(error.details).length > 0 ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }
  console.error("Unexpected recommendation error", error instanceof Error ? error.message : "unknown error");
  return Response.json(
    { error: { code: "RECOMMENDATION_CALCULATION_FAILED", message: "Recommendation failed.", retryable: true } },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(new RecommendationError("INVALID_REQUEST", "A JSON body is required.", { status: 400 }));
  }
  const parsed = createRecommendationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      new RecommendationError("INVALID_REQUEST", "A valid userVocalProfileId is required.", { status: 400 }),
    );
  }
  try {
    return Response.json(await getRecommendationResult(parsed.data.userVocalProfileId, session.user.id), {
      status: 200,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
