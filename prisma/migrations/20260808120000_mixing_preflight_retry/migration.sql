ALTER TABLE "MixingJob"
ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "retryable" BOOLEAN;

DROP INDEX "MixingJob_status_leaseExpiresAt_createdAt_idx";
CREATE INDEX "MixingJob_status_nextAttemptAt_leaseExpiresAt_createdAt_idx"
ON "MixingJob"("status", "nextAttemptAt", "leaseExpiresAt", "createdAt");
