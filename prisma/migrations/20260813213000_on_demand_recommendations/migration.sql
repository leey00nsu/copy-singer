ALTER TABLE "Catalog"
ADD COLUMN IF NOT EXISTS "revision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "MixingJob"
ADD COLUMN IF NOT EXISTS "songAnalysisId" UUID,
ADD COLUMN IF NOT EXISTS "catalogPosition" INTEGER,
ADD COLUMN IF NOT EXISTS "recommendedShift" INTEGER,
ADD COLUMN IF NOT EXISTS "catalogRevision" INTEGER,
ADD COLUMN IF NOT EXISTS "scoringVersion" TEXT;

WITH "backfill" AS (
  SELECT
    "mixing"."id",
    COALESCE("item"."songAnalysisId", "song"."currentAnalysisId") AS "songAnalysisId",
    COALESCE("mixing"."targetAssetId", "song"."targetAssetId") AS "targetAssetId",
    COALESCE("item"."catalogPosition", "entry"."position", 1) AS "catalogPosition",
    COALESCE("item"."recommendedShift", 0) AS "recommendedShift",
    COALESCE("catalog"."revision", 1) AS "catalogRevision",
    COALESCE("run"."scoringVersion", 'legacy') AS "scoringVersion"
  FROM "MixingJob" AS "mixing"
  JOIN "Song" AS "song"
    ON "song"."id" = "mixing"."songId"
  LEFT JOIN "RecommendationItem" AS "item"
    ON "item"."id" = "mixing"."recommendationItemId"
  LEFT JOIN "RecommendationRun" AS "run"
    ON "run"."id" = "item"."runId"
  LEFT JOIN "CatalogEntry" AS "entry"
    ON "entry"."songId" = "mixing"."songId"
  LEFT JOIN "Catalog" AS "catalog"
    ON "catalog"."id" = "entry"."catalogId"
)
UPDATE "MixingJob" AS "mixing"
SET
  "songAnalysisId" = "backfill"."songAnalysisId",
  "targetAssetId" = "backfill"."targetAssetId",
  "catalogPosition" = "backfill"."catalogPosition",
  "recommendedShift" = "backfill"."recommendedShift",
  "catalogRevision" = "backfill"."catalogRevision",
  "scoringVersion" = "backfill"."scoringVersion"
FROM "backfill"
WHERE "backfill"."id" = "mixing"."id";

ALTER TABLE "MixingJob"
ALTER COLUMN "songAnalysisId" SET NOT NULL,
ALTER COLUMN "targetAssetId" SET NOT NULL,
ALTER COLUMN "catalogPosition" SET NOT NULL,
ALTER COLUMN "recommendedShift" SET NOT NULL,
ALTER COLUMN "catalogRevision" SET NOT NULL,
ALTER COLUMN "scoringVersion" SET NOT NULL;

ALTER TABLE "MixingJob"
DROP CONSTRAINT "MixingJob_recommendationItemId_fkey";

DROP INDEX "MixingJob_recommendationItemId_createdAt_idx";

ALTER TABLE "MixingJob"
DROP COLUMN "recommendationItemId";

CREATE INDEX "MixingJob_vocalProfileId_songAnalysisId_createdAt_idx"
ON "MixingJob"("vocalProfileId", "songAnalysisId", "createdAt");

CREATE INDEX "MixingJob_songAnalysisId_idx"
ON "MixingJob"("songAnalysisId");

ALTER TABLE "MixingJob"
ADD CONSTRAINT "MixingJob_songAnalysisId_fkey"
FOREIGN KEY ("songAnalysisId") REFERENCES "SongAnalysis"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TABLE "RecommendationItem";
DROP TABLE "RecommendationRun";
DROP TYPE "SynthesisStatus";
