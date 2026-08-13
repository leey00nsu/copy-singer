UPDATE "RecommendationItem" AS item
SET "catalogPosition" = song."catalogOrder"
FROM "Song" AS song
WHERE item."songId" = song."id" AND item."catalogPosition" IS NULL;

ALTER TABLE "RecommendationItem" ALTER COLUMN "catalogPosition" SET NOT NULL;

DROP INDEX "Song_analysisStatus_catalogOrder_idx";
DROP INDEX "Song_catalogOrder_key";
ALTER TABLE "Song" DROP COLUMN "catalogOrder";
