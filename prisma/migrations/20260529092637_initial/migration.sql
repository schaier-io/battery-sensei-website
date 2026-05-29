-- CreateEnum
CREATE TYPE "SupportRequestStatus" AS ENUM ('pending', 'sent', 'failed', 'rate_limited_email', 'rate_limited_ip', 'honeypot');

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
    "confirmedAt" TIMESTAMP(3),
    "tokenEpoch" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportRequest" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSignup_email_key" ON "NewsletterSignup"("email");

-- CreateIndex
CREATE INDEX "NewsletterSignup_ipAddress_createdAt_idx" ON "NewsletterSignup"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSignup_createdAt_idx" ON "NewsletterSignup"("createdAt");

-- CreateIndex
CREATE INDEX "NewsletterSignup_source_createdAt_idx" ON "NewsletterSignup"("source", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SupportRequest_ticketId_key" ON "SupportRequest"("ticketId");

-- CreateIndex
CREATE INDEX "SupportRequest_email_createdAt_idx" ON "SupportRequest"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_ipAddress_createdAt_idx" ON "SupportRequest"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");
