-- CreateEnum
CREATE TYPE "NewsletterSource" AS ENUM ('pricing_free', 'thanks_page', 'other');

-- CreateTable
CREATE TABLE "NewsletterSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "source" "NewsletterSource" NOT NULL DEFAULT 'pricing_free',
    "releasesContactId" TEXT,
    "launchesContactId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "origin" TEXT,
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSignup_email_key" ON "NewsletterSignup"("email");

-- CreateIndex
CREATE INDEX "NewsletterSignup_createdAt_idx" ON "NewsletterSignup"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSignup_source_createdAt_idx" ON "NewsletterSignup"("source", "createdAt");
