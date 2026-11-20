-- Opt-in usage counts and crash reports from the macOS app. Additive only.
-- Guarded like 20260731170500_retention_enforcement so it is safe to re-run
-- against the production schema that started from a squashed legacy migration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AppTier') THEN
    CREATE TYPE "AppTier" AS ENUM ('paid', 'trial', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CrashReportStatus') THEN
    CREATE TYPE "CrashReportStatus" AS ENUM (
      'received', 'notified', 'notify_failed', 'duplicate'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "TelemetryDailyCount" (
    "day" DATE NOT NULL,
    "appVersion" VARCHAR(16) NOT NULL,
    "tier" "AppTier" NOT NULL,
    "osMajor" SMALLINT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TelemetryDailyCount_pkey" PRIMARY KEY ("day", "appVersion", "tier", "osMajor")
);

CREATE TABLE IF NOT EXISTS "CrashReport" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "appVersion" TEXT NOT NULL,
    "tier" "AppTier" NOT NULL,
    "osVersion" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "ips" TEXT NOT NULL,
    "note" TEXT,
    "status" "CrashReportStatus" NOT NULL DEFAULT 'received',
    "notifyEmailId" TEXT,
    "retentionHoldUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrashReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CrashReport_reportId_key" ON "CrashReport"("reportId");
CREATE INDEX IF NOT EXISTS "CrashReport_createdAt_idx" ON "CrashReport"("createdAt");
CREATE INDEX IF NOT EXISTS "CrashReport_signature_createdAt_idx" ON "CrashReport"("signature", "createdAt");
