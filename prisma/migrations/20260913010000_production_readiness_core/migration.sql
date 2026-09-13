-- AlterTable
ALTER TABLE "MixingJob" ADD COLUMN     "deadlineAt" TIMESTAMP(3),
ADD COLUMN     "submissionStartedAt" TIMESTAMP(3),
ADD COLUMN     "submissionState" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED';

-- AlterTable
ALTER TABLE "SongAnalysisJob" ADD COLUMN     "deadlineAt" TIMESTAMP(3),
ADD COLUMN     "submissionStartedAt" TIMESTAMP(3),
ADD COLUMN     "submissionState" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED';

-- AlterTable
ALTER TABLE "VocalProfileAnalysisJob" ADD COLUMN     "deadlineAt" TIMESTAMP(3),
ADD COLUMN     "submissionStartedAt" TIMESTAMP(3),
ADD COLUMN     "submissionState" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED';

-- CreateTable
CREATE TABLE "MediaOperation" (
    "id" UUID NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "userId" TEXT,
    "assetId" UUID,
    "assetType" TEXT,
    "externalProjectId" TEXT NOT NULL,
    "externalFileId" TEXT,
    "objectName" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "lastError" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignupGrantIntent" (
    "userId" TEXT NOT NULL,
    "kind" "TicketKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "operator" TEXT,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupGrantIntent_pkey" PRIMARY KEY ("userId","kind")
);

-- CreateTable
CREATE TABLE "ExternalJobReconciliation" (
    "id" UUID NOT NULL,
    "jobType" TEXT NOT NULL,
    "jobId" UUID NOT NULL,
    "externalJobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalJobReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaOperation_status_nextAttemptAt_idx" ON "MediaOperation"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "MediaOperation_assetId_idx" ON "MediaOperation"("assetId");

-- CreateIndex
CREATE INDEX "ExternalJobReconciliation_status_createdAt_idx" ON "ExternalJobReconciliation"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalJobReconciliation_jobType_jobId_key" ON "ExternalJobReconciliation"("jobType", "jobId");

