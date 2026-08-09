import { InsufficientTicketsError } from "@/entities/ticket/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";
import { adjustUserTickets } from "@/features/manage-tickets/index.server";

export async function ticketAdjustmentsPost(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => null)) as {
    userId?: unknown;
    amount?: unknown;
    reason?: unknown;
    idempotencyKey?: unknown;
  } | null;
  if (
    typeof body?.userId !== "string" ||
    typeof body.amount !== "number" ||
    typeof body.reason !== "string" ||
    typeof body.idempotencyKey !== "string"
  ) {
    return Response.json(
      { error: { code: "INVALID_REQUEST", message: "사용자, 조정량, 사유와 요청 키가 필요합니다." } },
      { status: 400 },
    );
  }
  try {
    const ledger = await adjustUserTickets({
      actorUserId: access.session.user.id,
      targetUserId: body.userId,
      amount: body.amount,
      reason: body.reason,
      idempotencyKey: body.idempotencyKey,
    });
    return Response.json(
      {
        id: ledger.id,
        amount: ledger.amount,
        balanceAfter: ledger.balanceAfter,
        reason: ledger.reason,
        createdAt: ledger.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "티켓을 조정하지 못했습니다.";
    return Response.json(
      {
        error: {
          code: error instanceof InsufficientTicketsError ? "INSUFFICIENT_TICKETS" : "TICKET_ADJUSTMENT_FAILED",
          message,
        },
      },
      { status: error instanceof InsufficientTicketsError ? 409 : 400 },
    );
  }
}
