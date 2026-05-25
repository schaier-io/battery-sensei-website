-- CreateEnum
CREATE TYPE "SupportRequestStatus" AS ENUM ('pending', 'sent', 'failed', 'rate_limited_email', 'rate_limited_ip', 'honeypot');

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
CREATE UNIQUE INDEX "SupportRequest_ticketId_key" ON "SupportRequest"("ticketId");

-- CreateIndex
CREATE INDEX "SupportRequest_email_createdAt_idx" ON "SupportRequest"("email", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_ipAddress_createdAt_idx" ON "SupportRequest"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_status_createdAt_idx" ON "SupportRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SupportRequest_createdAt_idx" ON "SupportRequest"("createdAt");
