CREATE TYPE "NotificationType" AS ENUM (
  'TICKET_CREDIT',
  'VOCAL_PROFILE_SUCCEEDED',
  'VOCAL_PROFILE_FAILED',
  'MIXING_SUCCEEDED',
  'MIXING_FAILED'
);

CREATE TABLE "Notification" (
  "id" UUID NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "sourceId" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_title_length" CHECK (char_length(btrim("title")) BETWEEN 1 AND 120),
  CONSTRAINT "Notification_message_length" CHECK (char_length(btrim("message")) BETWEEN 1 AND 500),
  CONSTRAINT "Notification_href_internal" CHECK ("href" ~ '^/[^/]'),
  CONSTRAINT "Notification_href_length" CHECK (char_length("href") <= 500),
  CONSTRAINT "Notification_sourceId_length" CHECK ("sourceId" IS NULL OR char_length("sourceId") <= 100),
  CONSTRAINT "Notification_dedupeKey_length" CHECK (char_length(btrim("dedupeKey")) BETWEEN 1 AND 200)
);

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
