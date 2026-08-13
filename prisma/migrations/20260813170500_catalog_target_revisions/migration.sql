-- DropIndex
DROP INDEX "CatalogTargetAsset_sourceId_key";

-- CreateIndex
CREATE INDEX "CatalogTargetAsset_sourceId_status_createdAt_idx" ON "CatalogTargetAsset"("sourceId", "status", "createdAt");
