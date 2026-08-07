ALTER TYPE "MediaAssetKind" ADD VALUE 'SYNTHESIS_REFERENCE';

ALTER TABLE "VocalProfile"
ADD COLUMN "synthesisReferenceAssetId" UUID;

CREATE UNIQUE INDEX "VocalProfile_synthesisReferenceAssetId_key"
ON "VocalProfile"("synthesisReferenceAssetId");

ALTER TABLE "VocalProfile"
ADD CONSTRAINT "VocalProfile_synthesisReferenceAssetId_fkey"
FOREIGN KEY ("synthesisReferenceAssetId") REFERENCES "MediaAsset"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
