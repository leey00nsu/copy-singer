CREATE TYPE "TicketKind" AS ENUM ('VOCAL_ANALYSIS', 'AI_MIXING');

ALTER TYPE "TicketLedgerType" RENAME VALUE 'MIXING_DEBIT' TO 'USAGE_DEBIT';
ALTER TYPE "TicketLedgerType" RENAME VALUE 'MIXING_REFUND' TO 'USAGE_REFUND';

ALTER TABLE "TicketLedger"
ADD COLUMN "kind" "TicketKind",
ADD COLUMN "vocalProfileAnalysisJobId" UUID;

ALTER TABLE "VocalProfileAnalysisJob"
ADD COLUMN "ticketCost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "refundState" "TicketRefundState" NOT NULL DEFAULT 'NONE';

CREATE TABLE "TicketWallet" (
  "userId" TEXT NOT NULL,
  "kind" "TicketKind" NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketWallet_pkey" PRIMARY KEY ("userId", "kind")
);

INSERT INTO "TicketWallet" ("userId", "kind", "balance", "createdAt", "updatedAt")
SELECT "id", 'AI_MIXING'::"TicketKind", "ticketBalance", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "User";

UPDATE "TicketLedger"
SET "kind" = 'AI_MIXING'::"TicketKind"
WHERE "kind" IS NULL;

ALTER TABLE "TicketLedger"
ALTER COLUMN "kind" SET NOT NULL;

ALTER TABLE "User" DROP COLUMN "ticketBalance";

DROP INDEX IF EXISTS "TicketLedger_userId_createdAt_idx";

CREATE INDEX "TicketWallet_kind_idx" ON "TicketWallet"("kind");
CREATE INDEX "TicketLedger_userId_kind_createdAt_idx" ON "TicketLedger"("userId", "kind", "createdAt");
CREATE INDEX "TicketLedger_vocalProfileAnalysisJobId_idx" ON "TicketLedger"("vocalProfileAnalysisJobId");

ALTER TABLE "TicketWallet"
ADD CONSTRAINT "TicketWallet_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketLedger"
ADD CONSTRAINT "TicketLedger_vocalProfileAnalysisJobId_fkey"
FOREIGN KEY ("vocalProfileAnalysisJobId") REFERENCES "VocalProfileAnalysisJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
