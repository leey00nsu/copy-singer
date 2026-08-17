-- Existing accounts have already entered the product without this onboarding.
-- Backfill only rows present when the migration runs; accounts created later
-- keep the nullable column unset and receive the onboarding once.
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

UPDATE "User"
SET "onboardingCompletedAt" = CURRENT_TIMESTAMP
WHERE "onboardingCompletedAt" IS NULL;
