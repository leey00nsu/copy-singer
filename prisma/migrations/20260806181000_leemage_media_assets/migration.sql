-- CreateEnum
CREATE TYPE "MediaAssetKind" AS ENUM ('REFERENCE', 'MIX_RESULT');
CREATE TYPE "MediaAssetStatus" AS ENUM ('READY', 'DELETE_PENDING', 'DELETED', 'FAILED');
CREATE TYPE "MediaCleanupStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "MediaAssetKind" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'LEEMAGE',
    "externalProjectId" TEXT NOT NULL,
    "externalFileId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'READY',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaCleanupJob" (
    "id" UUID NOT NULL,
    "mediaAssetId" UUID NOT NULL,
    "status" "MediaCleanupStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaCleanupJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Recording" ADD COLUMN "mediaAssetId" UUID;

CREATE UNIQUE INDEX "MediaAsset_externalProjectId_externalFileId_key" ON "MediaAsset"("externalProjectId", "externalFileId");
CREATE INDEX "MediaAsset_userId_kind_createdAt_idx" ON "MediaAsset"("userId", "kind", "createdAt");
CREATE INDEX "MediaAsset_status_updatedAt_idx" ON "MediaAsset"("status", "updatedAt");
CREATE INDEX "MediaCleanupJob_status_nextAttemptAt_idx" ON "MediaCleanupJob"("status", "nextAttemptAt");
CREATE UNIQUE INDEX "Recording_mediaAssetId_key" ON "Recording"("mediaAssetId");

ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaCleanupJob" ADD CONSTRAINT "MediaCleanupJob_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recording" ADD CONSTRAINT "Recording_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
