import { InsufficientTicketsError } from "@/entities/ticket/index.server";
import { requireAdminApi } from "@/features/authentication/index.server";
import { ticketAdjustmentRequestSchema } from "@/features/manage-tickets/index.model";
import { adjustUserTickets } from "@/features/manage-tickets/index.server";

export async function ticketAdjustmentsPost(request: Request) {
  const access = await requireAdminApi(request);
  if (access.response) return access.response;
  const body = ticketAdjustmentRequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return Response.json(
      { error: { code: "INVALID_REQUEST", message: "사용자, 조정량, 사유와 요청 키가 필요해요." } },
      { status: 400 },
    );
  }
  try {
    const ledger = await adjustUserTickets({
      actorUserId: access.session.user.id,
      targetUserId: body.data.userId,
      kind: body.data.kind,
      amount: body.data.amount,
      reason: body.data.reason,
      idempotencyKey: body.data.idempotencyKey,
    });
    return Response.json(
      {
        id: ledger.id,
        kind: ledger.kind,
        amount: ledger.amount,
        balanceAfter: ledger.balanceAfter,
        reason: ledger.reason,
        createdAt: ledger.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "티켓을 조정하지 못했어요.";
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
