export const runtime = "nodejs";

import { requireApiSession, unauthorizedResponse } from "@/lib/auth/session";
import { enqueueMixingJob } from "@/lib/mixing/queue";
import { MixingError, serializeMixingJob } from "@/lib/mixing/contract";
import { InsufficientTicketsError } from "@/lib/tickets/service";

export async function POST(request: Request) {
  const session = await requireApiSession(request);
  if (!session) return unauthorizedResponse();
  const body = await request.json().catch(() => null) as {
    recommendationItemId?: unknown;
    idempotencyKey?: unknown;
  } | null;
  if (typeof body?.recommendationItemId !== "string" || typeof body.idempotencyKey !== "string") {
    return Response.json({ error: { code: "INVALID_REQUEST", message: "추천 곡과 요청 키가 필요합니다." } }, { status: 400 });
  }
  try {
    const job = await enqueueMixingJob({
      userId: session.user.id,
      recommendationItemId: body.recommendationItemId,
      idempotencyKey: body.idempotencyKey,
    });
    return Response.json(serializeMixingJob(job), { status: 202 });
  } catch (error) {
    if (error instanceof InsufficientTicketsError) {
      return Response.json(
        { error: { code: "INSUFFICIENT_TICKETS", message: error.message, required: error.required, balance: error.balance } },
        { status: 402 },
      );
    }
    if (error instanceof MixingError) {
      return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.status });
    }
    return Response.json({ error: { code: "MIXING_ENQUEUE_FAILED", message: "믹싱 요청을 저장하지 못했습니다." } }, { status: 500 });
  }
}
