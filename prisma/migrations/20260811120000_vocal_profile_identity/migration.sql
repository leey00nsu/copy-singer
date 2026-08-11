ALTER TABLE "User"
ADD COLUMN "nextVocalProfileNumber" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "VocalProfile"
ADD COLUMN "profileNumber" INTEGER,
ADD COLUMN "displayName" TEXT;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC, "id" ASC)::INTEGER AS number
  FROM "VocalProfile"
  WHERE "sourceType" = 'USER' AND "userId" IS NOT NULL
)
UPDATE "VocalProfile" AS profile
SET
  "profileNumber" = numbered.number,
  "displayName" = '보컬 프로필 ' || numbered.number
FROM numbered
WHERE profile."id" = numbered."id";

UPDATE "User" AS app_user
SET "nextVocalProfileNumber" = COALESCE(
  (
    SELECT MAX(profile."profileNumber") + 1
    FROM "VocalProfile" AS profile
    WHERE profile."userId" = app_user."id" AND profile."sourceType" = 'USER'
  ),
  1
);

CREATE UNIQUE INDEX "VocalProfile_userId_profileNumber_key"
ON "VocalProfile"("userId", "profileNumber");

ALTER TABLE "VocalProfile"
ADD CONSTRAINT "VocalProfile_profileNumber_positive"
CHECK ("profileNumber" IS NULL OR "profileNumber" > 0);

ALTER TABLE "VocalProfile"
ADD CONSTRAINT "VocalProfile_displayName_length"
CHECK ("displayName" IS NULL OR char_length(btrim("displayName")) BETWEEN 1 AND 40);
