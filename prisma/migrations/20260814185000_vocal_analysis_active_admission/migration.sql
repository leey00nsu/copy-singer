-- Enforce one active vocal analysis per user at the database boundary.
CREATE UNIQUE INDEX "VocalProfileAnalysisJob_one_active_per_user"
ON "VocalProfileAnalysisJob" ("userId")
WHERE "status" IN ('PENDING', 'PROCESSING');
