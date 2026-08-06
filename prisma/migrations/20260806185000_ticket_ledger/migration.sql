CREATE TYPE "TicketLedgerType" AS ENUM ('SIGNUP_GRANT', 'MIXING_DEBIT', 'MIXING_REFUND', 'ADMIN_ADJUSTMENT');

ALTER TABLE "User" ADD COLUMN "ticketBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD CONSTRAINT "User_ticketBalance_nonnegative" CHECK ("ticketBalance" >= 0);

CREATE TABLE "TicketLedger" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TicketLedgerType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "mixingJobId" UUID,
    "actorUserId" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketLedger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TicketLedger_balanceAfter_nonnegative" CHECK ("balanceAfter" >= 0)
);

CREATE UNIQUE INDEX "TicketLedger_idempotencyKey_key" ON "TicketLedger"("idempotencyKey");
CREATE INDEX "TicketLedger_userId_createdAt_idx" ON "TicketLedger"("userId", "createdAt");
CREATE INDEX "TicketLedger_mixingJobId_idx" ON "TicketLedger"("mixingJobId");
CREATE INDEX "TicketLedger_actorUserId_createdAt_idx" ON "TicketLedger"("actorUserId", "createdAt");

ALTER TABLE "TicketLedger" ADD CONSTRAINT "TicketLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketLedger" ADD CONSTRAINT "TicketLedger_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
