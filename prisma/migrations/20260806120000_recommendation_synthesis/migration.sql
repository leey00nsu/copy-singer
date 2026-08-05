-- CreateEnum
CREATE TYPE "SynthesisStatus" AS ENUM ('PREPARING', 'QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "RecommendationItem"
ADD COLUMN "synthesisStatus" "SynthesisStatus",
ADD COLUMN "synthesisJobId" TEXT,
ADD COLUMN "synthesisErrorCode" TEXT,
ADD COLUMN "synthesisErrorDetail" TEXT,
ADD COLUMN "synthesisRetryable" BOOLEAN,
ADD COLUMN "synthesisAttempts" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "synthesisStartedAt" TIMESTAMP(3),
ADD COLUMN "synthesisUpdatedAt" TIMESTAMP(3),
ADD COLUMN "synthesisCompletedAt" TIMESTAMP(3),
ADD COLUMN "synthesisExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RecommendationItem_synthesisStatus_synthesisUpdatedAt_idx"
ON "RecommendationItem"("synthesisStatus", "synthesisUpdatedAt");
