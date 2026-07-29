-- CreateEnum
CREATE TYPE "FeatureRequestStatus" AS ENUM ('pending', 'open', 'planned', 'in_progress', 'shipped', 'rejected');

-- CreateEnum
CREATE TYPE "FeatureRequestSource" AS ENUM ('web', 'app');

-- CreateTable
CREATE TABLE "FeatureRequest" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureVote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LicenseVoter" (
    "voterHash" TEXT NOT NULL,
    "lastValidatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LicenseVoter_pkey" PRIMARY KEY ("voterHash")
);

-- CreateTable
CREATE TABLE "AdminLoginAttempt" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureRequest_ticketId_key" ON "FeatureRequest"("ticketId");

-- CreateIndex
CREATE INDEX "FeatureRequest_status_votesCount_idx" ON "FeatureRequest"("status", "votesCount");

-- CreateIndex
CREATE INDEX "FeatureRequest_status_createdAt_idx" ON "FeatureRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FeatureRequest_email_createdAt_idx" ON "FeatureRequest"("email", "createdAt");

-- CreateIndex
CREATE INDEX "FeatureRequest_ipAddress_createdAt_idx" ON "FeatureRequest"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "FeatureRequest_createdAt_idx" ON "FeatureRequest"("createdAt");

-- CreateIndex
CREATE INDEX "FeatureVote_voterHash_idx" ON "FeatureVote"("voterHash");

-- CreateIndex
CREATE INDEX "FeatureVote_ipAddress_createdAt_idx" ON "FeatureVote"("ipAddress", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureVote_requestId_voterHash_key" ON "FeatureVote"("requestId", "voterHash");

-- CreateIndex
CREATE INDEX "AdminLoginAttempt_ipAddress_createdAt_idx" ON "AdminLoginAttempt"("ipAddress", "createdAt");

-- AddForeignKey
ALTER TABLE "FeatureVote" ADD CONSTRAINT "FeatureVote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "FeatureRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
