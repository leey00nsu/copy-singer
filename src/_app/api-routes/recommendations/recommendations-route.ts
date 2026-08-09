import { RecommendationError } from "@/entities/recommendation";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { createRecommendationRun } from "@/features/create-recommendation/index.server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    { error: { code: "RECOMMENDATION_SAVE_FAILED", message: "Recommendation failed.", retryable: true } },
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
  const userVocalProfileId =
    body && typeof body === "object" && "userVocalProfileId" in body
      ? (body as { userVocalProfileId?: unknown }).userVocalProfileId
      : undefined;
  if (typeof userVocalProfileId !== "string" || !UUID_PATTERN.test(userVocalProfileId)) {
    return errorResponse(
      new RecommendationError("INVALID_REQUEST", "A valid userVocalProfileId is required.", { status: 400 }),
    );
  }
  try {
    return Response.json(await createRecommendationRun(userVocalProfileId, session.user.id), { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
