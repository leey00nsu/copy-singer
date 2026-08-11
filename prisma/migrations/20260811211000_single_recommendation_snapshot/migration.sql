-- Keep the newest recommendation snapshot for each vocal profile before
-- enforcing the one-profile/one-snapshot product contract.
WITH "rankedRuns" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userVocalProfileId"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS "snapshotRank"
  FROM "RecommendationRun"
)
DELETE FROM "RecommendationRun"
WHERE "id" IN (
  SELECT "id"
  FROM "rankedRuns"
  WHERE "snapshotRank" > 1
);

DROP INDEX IF EXISTS "RecommendationRun_userVocalProfileId_createdAt_idx";

CREATE UNIQUE INDEX "RecommendationRun_userVocalProfileId_key"
ON "RecommendationRun"("userVocalProfileId");
