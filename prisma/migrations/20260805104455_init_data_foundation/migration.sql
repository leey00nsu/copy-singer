-- CreateEnum
CREATE TYPE "RecordingKind" AS ENUM ('USER_TEST', 'SONG_SOURCE', 'SVC_REFERENCE', 'SVC_TARGET');

-- CreateEnum
CREATE TYPE "RecordingStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "VocalProfileSourceType" AS ENUM ('USER', 'SONG');

-- CreateEnum
CREATE TYPE "SongAnalysisStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "Recording" (
    "id" UUID NOT NULL,
    "kind" "RecordingKind" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "durationMs" INTEGER,
    "sizeBytes" BIGINT,
    "sampleRate" INTEGER,
    "status" "RecordingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocalProfile" (
    "id" UUID NOT NULL,
    "sourceType" "VocalProfileSourceType" NOT NULL,
    "recordingId" UUID NOT NULL,
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
    "descriptors" JSONB,
    "analyzer" TEXT NOT NULL,
    "analyzerVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "originalKey" TEXT,
    "catalogOrder" INTEGER NOT NULL,
    "vocalProfileId" UUID,
    "analysisStatus" "SongAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationRun" (
    "id" UUID NOT NULL,
    "userVocalProfileId" UUID NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationItem" (
    "id" UUID NOT NULL,
    "runId" UUID NOT NULL,
    "songId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "originalKeyScore" DOUBLE PRECISION NOT NULL,
    "adjustedScore" DOUBLE PRECISION NOT NULL,
    "recommendedShift" INTEGER NOT NULL,
    "reasonCodes" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Recording_kind_status_idx" ON "Recording"("kind", "status");

-- CreateIndex
CREATE INDEX "Recording_createdAt_idx" ON "Recording"("createdAt");

-- CreateIndex
CREATE INDEX "Recording_expiresAt_idx" ON "Recording"("expiresAt");

-- CreateIndex
CREATE INDEX "VocalProfile_sourceType_createdAt_idx" ON "VocalProfile"("sourceType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VocalProfile_recordingId_analyzer_analyzerVersion_key" ON "VocalProfile"("recordingId", "analyzer", "analyzerVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Song_catalogOrder_key" ON "Song"("catalogOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Song_vocalProfileId_key" ON "Song"("vocalProfileId");

-- CreateIndex
CREATE INDEX "Song_analysisStatus_catalogOrder_idx" ON "Song"("analysisStatus", "catalogOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Song_title_artist_key" ON "Song"("title", "artist");

-- CreateIndex
CREATE INDEX "RecommendationRun_userVocalProfileId_createdAt_idx" ON "RecommendationRun"("userVocalProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "RecommendationItem_songId_idx" ON "RecommendationItem"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationItem_runId_rank_key" ON "RecommendationItem"("runId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationItem_runId_songId_key" ON "RecommendationItem"("runId", "songId");

-- AddForeignKey
ALTER TABLE "VocalProfile" ADD CONSTRAINT "VocalProfile_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Song" ADD CONSTRAINT "Song_vocalProfileId_fkey" FOREIGN KEY ("vocalProfileId") REFERENCES "VocalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationRun" ADD CONSTRAINT "RecommendationRun_userVocalProfileId_fkey" FOREIGN KEY ("userVocalProfileId") REFERENCES "VocalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RecommendationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationItem" ADD CONSTRAINT "RecommendationItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
