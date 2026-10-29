import "server-only";

import { createNotification } from "@/entities/notification/index.server";
import { type TicketKind, ticketKindLabel } from "@/entities/ticket/index.model";
import { applyTicketChange } from "@/entities/ticket/index.server";
import { prisma } from "@/shared/db/index.server";

export async function adjustUserTickets(input: {
  actorUserId: string;
  targetUserId: string;
  kind: TicketKind;
  amount: number;
  reason: string;
  idempotencyKey: string;
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount === 0 || Math.abs(input.amount) > 10_000) {
    throw new Error("티켓 조정량은 0이 아닌 -10000~10000 정수여야 해요.");
  }
  if (input.reason.trim().length < 3 || input.reason.trim().length > 500) {
    throw new Error("조정 사유를 3~500자로 입력해 주세요.");
  }
  const target = await prisma.user.findUnique({ where: { id: input.targetUserId }, select: { isGuest: true } });
  if (!target || target.isGuest) throw new Error("정식 회원에게만 티켓을 조정할 수 있어요.");
  const ledger = await applyTicketChange({
    userId: input.targetUserId,
    kind: input.kind,
    type: "ADMIN_ADJUSTMENT",
    amount: input.amount,
    idempotencyKey: `admin:${input.actorUserId}:${input.idempotencyKey}`,
    actorUserId: input.actorUserId,
    reason: input.reason,
  });
  if (ledger.amount > 0) {
    const label = ticketKindLabel(input.kind);
    await createNotification({
      userId: input.targetUserId,
      type: "TICKET_CREDIT",
      title: `${label}이 추가됐어요`,
      message: `${label} ${ledger.amount}장이 추가됐어요. ${ledger.reason}`.slice(0, 500),
      href: "/account",
      sourceId: ledger.id,
      dedupeKey: `ticket-ledger:${ledger.id}`,
    });
  }
  return ledger;
}
