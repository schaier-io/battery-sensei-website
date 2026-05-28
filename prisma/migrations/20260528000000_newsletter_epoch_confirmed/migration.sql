-- AlterTable
ALTER TABLE "NewsletterSignup"
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "tokenEpoch" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "NewsletterSignup_ipAddress_createdAt_idx"
  ON "NewsletterSignup"("ipAddress", "createdAt");
