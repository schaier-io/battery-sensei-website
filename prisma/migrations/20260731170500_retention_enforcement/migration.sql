-- Production originally used a squashed legacy migration with ContactRequest
-- and the first NewsletterSignup shape. Keep this migration safe for both that
-- deployed schema and clean databases created from the checked-in migrations.

-- Enums required by the current schema.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupportRequestStatus') THEN
    CREATE TYPE "SupportRequestStatus" AS ENUM (
      'pending', 'sent', 'failed', 'rate_limited_email',
      'rate_limited_ip', 'honeypot'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NewsletterSource') THEN
    CREATE TYPE "NewsletterSource" AS ENUM ('pricing_free', 'thanks_page', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeatureRequestStatus') THEN
    CREATE TYPE "FeatureRequestStatus" AS ENUM (
      'pending', 'open', 'planned', 'in_progress', 'shipped', 'rejected'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeatureRequestSource') THEN
    CREATE TYPE "FeatureRequestSource" AS ENUM ('web', 'app');
  END IF;
END
$$;

-- Preserve legacy newsletter rows while replacing retired status/source fields.
ALTER TABLE "NewsletterSignup"
  ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS "releasesContactId" TEXT,
  ADD COLUMN IF NOT EXISTS "launchesContactId" TEXT,
  ADD COLUMN IF NOT EXISTS "unsubscribedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "tokenEpoch" INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'NewsletterSignup'
      AND column_name = 'status'
  ) THEN
    EXECUTE '
      UPDATE "NewsletterSignup"
      SET "confirmedAt" = COALESCE("confirmedAt", "updatedAt")
      WHERE "status"::text = ''confirmed''
    ';
    EXECUTE 'ALTER TABLE "NewsletterSignup" DROP COLUMN "status"';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'NewsletterSignup'
      AND column_name = 'source'
      AND udt_name <> 'NewsletterSource'
  ) THEN
    EXECUTE 'ALTER TABLE "NewsletterSignup" ALTER COLUMN "source" DROP DEFAULT';
    EXECUTE '
      ALTER TABLE "NewsletterSignup"
      ALTER COLUMN "source" TYPE "NewsletterSource"
      USING (
        CASE
          WHEN "source" IN (''pricing_free'', ''home_release_notes'')
            THEN ''pricing_free''::"NewsletterSource"
          WHEN "source" = ''thanks_page''
            THEN ''thanks_page''::"NewsletterSource"
          ELSE ''other''::"NewsletterSource"
        END
      )
    ';
    EXECUTE '
      ALTER TABLE "NewsletterSignup"
      ALTER COLUMN "source" SET DEFAULT ''pricing_free''::"NewsletterSource"
    ';
  END IF;
END
$$;

DROP INDEX IF EXISTS "NewsletterSignup_email_status_createdAt_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterSignup_email_key"
  ON "NewsletterSignup"("email");
CREATE INDEX IF NOT EXISTS "NewsletterSignup_ipAddress_createdAt_idx"
  ON "NewsletterSignup"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "NewsletterSignup_createdAt_idx"
  ON "NewsletterSignup"("createdAt");
CREATE INDEX IF NOT EXISTS "NewsletterSignup_source_createdAt_idx"
  ON "NewsletterSignup"("source", "createdAt");

-- Replace the legacy ContactRequest table without dropping its records.
CREATE TABLE IF NOT EXISTS "SupportRequest" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "rawName" TEXT,
  "rawEmail" TEXT,
  "rawTopic" TEXT,
  "rawSubject" TEXT,
  "rawMessage" TEXT,
  "rawPayload" JSONB NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "origin" TEXT,
  "supportEmailId" TEXT,
  "confirmationEmailId" TEXT,
  "status" "SupportRequestStatus" NOT NULL DEFAULT 'pending',
  "retentionHoldUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF to_regclass('"ContactRequest"') IS NOT NULL THEN
    INSERT INTO "SupportRequest" (
      "id", "ticketId", "rawName", "rawEmail", "rawTopic", "rawSubject",
      "rawMessage", "rawPayload", "name", "email", "topic", "subject",
      "message", "ipAddress", "userAgent", "origin", "status",
      "createdAt", "updatedAt"
    )
    SELECT
      "id", "ticketId",
      COALESCE("rawPayload"->>'name', "name"),
      COALESCE("rawPayload"->>'email', "email"),
      COALESCE("rawPayload"->>'topic', "topic"),
      COALESCE("rawPayload"->>'subject', "topic"),
      COALESCE("rawPayload"->>'message', "message"),
      "rawPayload", "name", "email", "topic",
      COALESCE(NULLIF("rawPayload"->>'subject', ''), "topic", 'Support request'),
      "message", "ipAddress", "userAgent", "origin",
      CASE
        WHEN "status"::text IN (
          'pending', 'sent', 'failed', 'rate_limited_email',
          'rate_limited_ip', 'honeypot'
        ) THEN "status"::text::"SupportRequestStatus"
        ELSE 'failed'::"SupportRequestStatus"
      END,
      "createdAt", "updatedAt"
    FROM "ContactRequest"
    ON CONFLICT ("id") DO NOTHING;

    IF EXISTS (
      SELECT 1 FROM "ContactRequest" legacy
      WHERE NOT EXISTS (
        SELECT 1 FROM "SupportRequest" current
        WHERE current."id" = legacy."id"
      )
    ) THEN
      RAISE EXCEPTION 'Legacy support-request migration did not preserve every row';
    END IF;

    DROP TABLE "ContactRequest";
  END IF;
END
$$;

ALTER TABLE "SupportRequest"
  ADD COLUMN IF NOT EXISTS "retentionHoldUntil" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "SupportRequest_ticketId_key"
  ON "SupportRequest"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportRequest_email_createdAt_idx"
  ON "SupportRequest"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportRequest_ipAddress_createdAt_idx"
  ON "SupportRequest"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportRequest_status_createdAt_idx"
  ON "SupportRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportRequest_createdAt_idx"
  ON "SupportRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "SupportRequest_updatedAt_idx"
  ON "SupportRequest"("updatedAt");

-- Feature board: preserve public requests and votes; only retention metadata is
-- added. These CREATE statements also bootstrap the legacy production schema.
CREATE TABLE IF NOT EXISTS "FeatureRequest" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "rawTitle" TEXT,
  "rawBody" TEXT,
  "rawEmail" TEXT,
  "rawName" TEXT,
  "rawPayload" JSONB NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT '',
  "locale" TEXT NOT NULL DEFAULT 'en',
  "publicTitle" TEXT,
  "publicBody" TEXT,
  "status" "FeatureRequestStatus" NOT NULL DEFAULT 'pending',
  "source" "FeatureRequestSource" NOT NULL DEFAULT 'web',
  "rejectionReason" TEXT,
  "adminNote" TEXT,
  "moderatedAt" TIMESTAMP(3),
  "votesCount" INTEGER NOT NULL DEFAULT 0,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "origin" TEXT,
  "adminNotifyEmailId" TEXT,
  "confirmationEmailId" TEXT,
  "decisionEmailId" TEXT,
  "privateDataPurgedAt" TIMESTAMP(3),
  "retentionHoldUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "FeatureVote" (
  "id" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "voterHash" TEXT NOT NULL,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LicenseVoter" (
  "voterHash" TEXT NOT NULL,
  "lastValidatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LicenseVoter_pkey" PRIMARY KEY ("voterHash")
);

CREATE TABLE IF NOT EXISTS "AdminLoginAttempt" (
  "id" TEXT NOT NULL,
  "ipAddress" TEXT,
  "success" BOOLEAN NOT NULL,
  "retentionHoldUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "FeatureRequest"
  ADD COLUMN IF NOT EXISTS "privateDataPurgedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "retentionHoldUntil" TIMESTAMP(3);
ALTER TABLE "AdminLoginAttempt"
  ADD COLUMN IF NOT EXISTS "retentionHoldUntil" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureRequest_ticketId_key"
  ON "FeatureRequest"("ticketId");
CREATE INDEX IF NOT EXISTS "FeatureRequest_status_votesCount_idx"
  ON "FeatureRequest"("status", "votesCount");
CREATE INDEX IF NOT EXISTS "FeatureRequest_status_createdAt_idx"
  ON "FeatureRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "FeatureRequest_email_createdAt_idx"
  ON "FeatureRequest"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "FeatureRequest_ipAddress_createdAt_idx"
  ON "FeatureRequest"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "FeatureRequest_createdAt_idx"
  ON "FeatureRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "FeatureRequest_updatedAt_idx"
  ON "FeatureRequest"("updatedAt");
CREATE INDEX IF NOT EXISTS "FeatureRequest_privateDataPurgedAt_moderatedAt_idx"
  ON "FeatureRequest"("privateDataPurgedAt", "moderatedAt");
CREATE INDEX IF NOT EXISTS "FeatureVote_voterHash_idx"
  ON "FeatureVote"("voterHash");
CREATE INDEX IF NOT EXISTS "FeatureVote_ipAddress_createdAt_idx"
  ON "FeatureVote"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "FeatureVote_createdAt_idx"
  ON "FeatureVote"("createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "FeatureVote_requestId_voterHash_key"
  ON "FeatureVote"("requestId", "voterHash");
CREATE INDEX IF NOT EXISTS "AdminLoginAttempt_ipAddress_createdAt_idx"
  ON "AdminLoginAttempt"("ipAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "AdminLoginAttempt_createdAt_idx"
  ON "AdminLoginAttempt"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FeatureVote_requestId_fkey'
      AND conrelid = '"FeatureVote"'::regclass
  ) THEN
    ALTER TABLE "FeatureVote"
      ADD CONSTRAINT "FeatureVote_requestId_fkey"
      FOREIGN KEY ("requestId") REFERENCES "FeatureRequest"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- Retired types are safe to remove after their legacy columns/tables are gone.
DROP TYPE IF EXISTS "ContactRequestStatus";
DROP TYPE IF EXISTS "NewsletterSignupStatus";
