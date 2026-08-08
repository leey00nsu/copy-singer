CREATE TYPE "VocalProfileAnalysisJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

CREATE TABLE "VocalProfileAnalysisJob" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "recordingId" UUID NOT NULL,
    "sourceAssetId" UUID,
    "vocalProfileId" UUID,
    "status" "VocalProfileAnalysisJobStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorDetail" TEXT,
    "retryable" BOOLEAN,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocalProfileAnalysisJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VocalProfileAnalysisJob_attempts_nonnegative" CHECK ("attempts" >= 0),
    CONSTRAINT "VocalProfileAnalysisJob_maxAttempts_positive" CHECK ("maxAttempts" > 0)
);

CREATE UNIQUE INDEX "VocalProfileAnalysisJob_recordingId_key" ON "VocalProfileAnalysisJob"("recordingId");
CREATE UNIQUE INDEX "VocalProfileAnalysisJob_vocalProfileId_key" ON "VocalProfileAnalysisJob"("vocalProfileId");
CREATE UNIQUE INDEX "VocalProfileAnalysisJob_userId_idempotencyKey_key" ON "VocalProfileAnalysisJob"("userId", "idempotencyKey");
CREATE INDEX "VocalProfileAnalysisJob_status_nextAttemptAt_leaseExpiresAt_createdAt_idx" ON "VocalProfileAnalysisJob"("status", "nextAttemptAt", "leaseExpiresAt", "createdAt");
CREATE INDEX "VocalProfileAnalysisJob_userId_createdAt_idx" ON "VocalProfileAnalysisJob"("userId", "createdAt");

ALTER TABLE "VocalProfileAnalysisJob" ADD CONSTRAINT "VocalProfileAnalysisJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VocalProfileAnalysisJob" ADD CONSTRAINT "VocalProfileAnalysisJob_sourceAssetId_fkey" FOREIGN KEY ("sourceAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VocalProfileAnalysisJob" ADD CONSTRAINT "VocalProfileAnalysisJob_vocalProfileId_fkey" FOREIGN KEY ("vocalProfileId") REFERENCES "VocalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
