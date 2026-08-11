import "server-only";

import { createNotification } from "@/entities/notification/index.server";
import { applyTicketChange } from "@/entities/ticket/index.server";

export async function adjustUserTickets(input: {
  actorUserId: string;
  targetUserId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount === 0 || Math.abs(input.amount) > 10_000) {
    throw new Error("티켓 조정량은 0이 아닌 -10000~10000 정수여야 합니다.");
  }
  if (input.reason.trim().length < 3 || input.reason.trim().length > 500) {
    throw new Error("조정 사유를 3~500자로 입력해주세요.");
  }
  const ledger = await applyTicketChange({
    userId: input.targetUserId,
    type: "ADMIN_ADJUSTMENT",
    amount: input.amount,
    idempotencyKey: `admin:${input.actorUserId}:${input.idempotencyKey}`,
    actorUserId: input.actorUserId,
    reason: input.reason,
  });
  if (ledger.amount > 0) {
    await createNotification({
      userId: input.targetUserId,
      type: "TICKET_CREDIT",
      title: "티켓이 추가되었습니다",
      message: `티켓 ${ledger.amount}개가 추가되었습니다. ${ledger.reason}`.slice(0, 500),
      href: "/account",
      sourceId: ledger.id,
      dedupeKey: `ticket-ledger:${ledger.id}`,
    });
  }
  return ledger;
}
