-- AlterTable
ALTER TABLE "SongAnalysisJob"
ADD COLUMN "externalJobId" TEXT,
ADD COLUMN "externalSubmittedAt" TIMESTAMP(3);
