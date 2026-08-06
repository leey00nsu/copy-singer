CREATE TYPE "MixingJobStatus" AS ENUM ('PENDING', 'PREPARING', 'SUBMITTED', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELED');
CREATE TYPE "TicketRefundState" AS ENUM ('NONE', 'REQUIRED', 'REFUNDED');

CREATE TABLE "MixingJob" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "vocalProfileId" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "recommendationItemId" UUID,
    "referenceAssetId" UUID NOT NULL,
    "resultAssetId" UUID,
    "status" "MixingJobStatus" NOT NULL DEFAULT 'PENDING',
    "ticketCost" INTEGER NOT NULL,
    "refundState" "TicketRefundState" NOT NULL DEFAULT 'NONE',
    "idempotencyKey" TEXT NOT NULL,
    "modalJobId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorDetail" TEXT,
    "submittedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MixingJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MixingJob_ticketCost_nonnegative" CHECK ("ticketCost" >= 0),
    CONSTRAINT "MixingJob_attempts_nonnegative" CHECK ("attempts" >= 0),
    CONSTRAINT "MixingJob_maxAttempts_positive" CHECK ("maxAttempts" > 0)
);

CREATE UNIQUE INDEX "MixingJob_userId_idempotencyKey_key" ON "MixingJob"("userId", "idempotencyKey");
CREATE INDEX "MixingJob_status_leaseExpiresAt_createdAt_idx" ON "MixingJob"("status", "leaseExpiresAt", "createdAt");
CREATE INDEX "MixingJob_userId_createdAt_idx" ON "MixingJob"("userId", "createdAt");
CREATE INDEX "MixingJob_recommendationItemId_createdAt_idx" ON "MixingJob"("recommendationItemId", "createdAt");
CREATE INDEX "MixingJob_modalJobId_idx" ON "MixingJob"("modalJobId");

ALTER TABLE "MixingJob" ADD CONSTRAINT "MixingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MixingJob" ADD CONSTRAINT "MixingJob_vocalProfileId_fkey" FOREIGN KEY ("vocalProfileId") REFERENCES "VocalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MixingJob" ADD CONSTRAINT "MixingJob_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MixingJob" ADD CONSTRAINT "MixingJob_recommendationItemId_fkey" FOREIGN KEY ("recommendationItemId") REFERENCES "RecommendationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MixingJob" ADD CONSTRAINT "MixingJob_referenceAssetId_fkey" FOREIGN KEY ("referenceAssetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MixingJob" ADD CONSTRAINT "MixingJob_resultAssetId_fkey" FOREIGN KEY ("resultAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketLedger" ADD CONSTRAINT "TicketLedger_mixingJobId_fkey" FOREIGN KEY ("mixingJobId") REFERENCES "MixingJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
