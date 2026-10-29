-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "GuestAnalysisTrial" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" UUID,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestAnalysisTrial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestAnalysisTrial_tokenHash_key" ON "GuestAnalysisTrial"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "GuestAnalysisTrial_userId_key" ON "GuestAnalysisTrial"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuestAnalysisTrial_jobId_key" ON "GuestAnalysisTrial"("jobId");

-- CreateIndex
CREATE INDEX "GuestAnalysisTrial_claimedAt_expiresAt_idx" ON "GuestAnalysisTrial"("claimedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "GuestAnalysisTrial" ADD CONSTRAINT "GuestAnalysisTrial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestAnalysisTrial" ADD CONSTRAINT "GuestAnalysisTrial_claimedByUserId_fkey" FOREIGN KEY ("claimedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestAnalysisTrial" ADD CONSTRAINT "GuestAnalysisTrial_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "VocalProfileAnalysisJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

