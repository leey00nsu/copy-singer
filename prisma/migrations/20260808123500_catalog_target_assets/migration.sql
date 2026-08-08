CREATE TABLE "CatalogTargetAsset" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'LEEMAGE',
    "externalProjectId" TEXT NOT NULL,
    "externalFileId" TEXT NOT NULL,
    "externalUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "sha256" TEXT NOT NULL,
    "sourceVideoId" TEXT NOT NULL,
    "status" "MediaAssetStatus" NOT NULL DEFAULT 'READY',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogTargetAsset_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Song" ADD COLUMN "targetAssetId" UUID;
ALTER TABLE "MixingJob" ADD COLUMN "targetAssetId" UUID;

CREATE UNIQUE INDEX "CatalogTargetAsset_externalProjectId_externalFileId_key" ON "CatalogTargetAsset"("externalProjectId", "externalFileId");
CREATE INDEX "CatalogTargetAsset_status_updatedAt_idx" ON "CatalogTargetAsset"("status", "updatedAt");
CREATE INDEX "CatalogTargetAsset_sourceVideoId_idx" ON "CatalogTargetAsset"("sourceVideoId");
CREATE UNIQUE INDEX "Song_targetAssetId_key" ON "Song"("targetAssetId");
CREATE INDEX "MixingJob_targetAssetId_idx" ON "MixingJob"("targetAssetId");

ALTER TABLE "Song" ADD CONSTRAINT "Song_targetAssetId_fkey" FOREIGN KEY ("targetAssetId") REFERENCES "CatalogTargetAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MixingJob" ADD CONSTRAINT "MixingJob_targetAssetId_fkey" FOREIGN KEY ("targetAssetId") REFERENCES "CatalogTargetAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
