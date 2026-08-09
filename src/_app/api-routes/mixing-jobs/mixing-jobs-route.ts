import {
  getMixingHistory,
  MixingError,
  mixingHistoryFiltersSchema,
  serializeMixingJob,
} from "@/entities/mixing-job/index.server";
import { InsufficientTicketsError } from "@/entities/ticket/index.server";
import { requireApiSession, unauthorizedResponse } from "@/features/authentication/index.server";
import { createMixingRequestSchema } from "@/features/create-mixing/index.model";
import { enqueueMixingJob } from "@/features/create-mixing/index.server";

export async function GET(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const searchParams = new URL(request.url).searchParams;
  const filters = mixingHistoryFiltersSchema.parse({
    page: searchParams.get("page"),
    q: searchParams.get("q"),
    status: searchParams.get("status"),
  });
  return Response.json(await getMixingHistory(session.user.id, filters));
}

export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const body = createMixingRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: { code: "INVALID_REQUEST", message: "추천 곡과 요청 키가 필요합니다." } },
      { status: 400 },
    );
  }
  try {
    const job = await enqueueMixingJob({
      userId: session.user.id,
      recommendationItemId: body.data.recommendationItemId,
      idempotencyKey: body.data.idempotencyKey,
    });
    return Response.json(serializeMixingJob(job), { status: 202 });
  } catch (error) {
    if (error instanceof InsufficientTicketsError) {
      return Response.json(
        {
          error: {
            code: "INSUFFICIENT_TICKETS",
            message: error.message,
            required: error.required,
            balance: error.balance,
          },
        },
        { status: 402 },
      );
    }
    if (error instanceof MixingError) {
      return Response.json(
        { error: { code: error.code, message: error.message, retryable: error.retryable } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "MIXING_ENQUEUE_FAILED", message: "믹싱 요청을 저장하지 못했습니다." } },
      { status: 500 },
    );
  }
}
