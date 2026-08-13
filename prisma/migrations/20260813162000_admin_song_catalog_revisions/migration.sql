-- CreateEnum
CREATE TYPE "SongLifecycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SongSourceStatus" AS ENUM ('DRAFT', 'READY', 'SUPERSEDED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SongAnalysisJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CatalogEntryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "CatalogTargetAsset" ADD COLUMN     "sourceId" UUID;

-- AlterTable
ALTER TABLE "RecommendationItem" ADD COLUMN     "songAnalysisId" UUID;

-- AlterTable
ALTER TABLE "Song" ADD COLUMN     "activeSourceId" UUID,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "currentAnalysisId" UUID,
ADD COLUMN     "lifecycleStatus" "SongLifecycleStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "SongSource" (
    "id" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceVideoId" TEXT NOT NULL,
    "sourceLabel" TEXT NOT NULL,
    "status" "SongSourceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongAnalysis" (
    "id" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "status" "SongAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "pipelineContract" TEXT NOT NULL,
    "durationMs" INTEGER,
    "sampleRate" INTEGER,
    "sourceSizeBytes" BIGINT,
    "minMidi" DOUBLE PRECISION,
    "maxMidi" DOUBLE PRECISION,
    "p10Midi" DOUBLE PRECISION,
    "medianMidi" DOUBLE PRECISION,
    "p90Midi" DOUBLE PRECISION,
    "tessituraLowMidi" DOUBLE PRECISION,
    "tessituraHighMidi" DOUBLE PRECISION,
    "voicedRatio" DOUBLE PRECISION,
    "pitchStability" DOUBLE PRECISION,
    "clippingRatio" DOUBLE PRECISION,
    "rmsDb" DOUBLE PRECISION,
    "analyzer" TEXT,
    "analyzerVersion" TEXT,
    "descriptors" JSONB,
    "pipelineMetadata" JSONB,
    "cleanupConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "errorCode" TEXT,
    "errorDetail" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongAnalysisJob" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "analysisId" UUID,
    "status" "SongAnalysisJobStatus" NOT NULL DEFAULT 'PENDING',
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

    CONSTRAINT "SongAnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catalog" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issue" TEXT,
    "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogEntry" (
    "id" UUID NOT NULL,
    "catalogId" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "CatalogEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SongSource_sourceVideoId_key" ON "SongSource"("sourceVideoId");

-- CreateIndex
CREATE INDEX "SongSource_songId_status_createdAt_idx" ON "SongSource"("songId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SongSource_createdByUserId_createdAt_idx" ON "SongSource"("createdByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SongSource_songId_revision_key" ON "SongSource"("songId", "revision");

-- CreateIndex
CREATE INDEX "SongAnalysis_songId_status_createdAt_idx" ON "SongAnalysis"("songId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SongAnalysis_status_updatedAt_idx" ON "SongAnalysis"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SongAnalysis_sourceId_pipelineContract_key" ON "SongAnalysis"("sourceId", "pipelineContract");

-- CreateIndex
CREATE UNIQUE INDEX "SongAnalysisJob_sourceId_key" ON "SongAnalysisJob"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "SongAnalysisJob_analysisId_key" ON "SongAnalysisJob"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "SongAnalysisJob_idempotencyKey_key" ON "SongAnalysisJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SongAnalysisJob_status_nextAttemptAt_leaseExpiresAt_created_idx" ON "SongAnalysisJob"("status", "nextAttemptAt", "leaseExpiresAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Catalog_slug_key" ON "Catalog"("slug");

-- CreateIndex
CREATE INDEX "Catalog_status_createdAt_idx" ON "Catalog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CatalogEntry_catalogId_status_position_idx" ON "CatalogEntry"("catalogId", "status", "position");

-- CreateIndex
CREATE INDEX "CatalogEntry_songId_status_idx" ON "CatalogEntry"("songId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogEntry_catalogId_position_key" ON "CatalogEntry"("catalogId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogEntry_catalogId_songId_key" ON "CatalogEntry"("catalogId", "songId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogTargetAsset_sourceId_key" ON "CatalogTargetAsset"("sourceId");

-- CreateIndex
CREATE INDEX "RecommendationItem_songAnalysisId_idx" ON "RecommendationItem"("songAnalysisId");

-- CreateIndex
CREATE UNIQUE INDEX "Song_activeSourceId_key" ON "Song"("activeSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Song_currentAnalysisId_key" ON "Song"("currentAnalysisId");

-- CreateIndex
CREATE INDEX "Song_lifecycleStatus_createdAt_idx" ON "Song"("lifecycleStatus", "createdAt");

-- CreateIndex
CREATE INDEX "Song_createdByUserId_createdAt_idx" ON "Song"("createdByUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_activeSourceId_fkey" FOREIGN KEY ("activeSourceId") REFERENCES "SongSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_currentAnalysisId_fkey" FOREIGN KEY ("currentAnalysisId") REFERENCES "SongAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongSource" ADD CONSTRAINT "SongSource_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongSource" ADD CONSTRAINT "SongSource_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAnalysis" ADD CONSTRAINT "SongAnalysis_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAnalysis" ADD CONSTRAINT "SongAnalysis_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SongSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAnalysisJob" ADD CONSTRAINT "SongAnalysisJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SongSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongAnalysisJob" ADD CONSTRAINT "SongAnalysisJob_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "SongAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogEntry" ADD CONSTRAINT "CatalogEntry_catalogId_fkey" FOREIGN KEY ("catalogId") REFERENCES "Catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogEntry" ADD CONSTRAINT "CatalogEntry_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_songAnalysisId_fkey" FOREIGN KEY ("songAnalysisId") REFERENCES "SongAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogTargetAsset" ADD CONSTRAINT "CatalogTargetAsset_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SongSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "VocalProfileAnalysisJob_status_nextAttemptAt_leaseExpiresAt_cre" RENAME TO "VocalProfileAnalysisJob_status_nextAttemptAt_leaseExpiresAt_idx";
