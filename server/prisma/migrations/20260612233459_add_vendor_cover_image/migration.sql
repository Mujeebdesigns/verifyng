/*
  Warnings:

  - The `status` column on the `ContactMessage` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `recurringComplaints` column on the `VendorSummary` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ContactMessageStatus" AS ENUM ('PENDING', 'RESOLVED');

-- DropIndex
DROP INDEX "Vendor_ownerId_key";

-- AlterTable
ALTER TABLE "ContactMessage" DROP COLUMN "status",
ADD COLUMN     "status" "ContactMessageStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "coverImage" TEXT,
ALTER COLUMN "trustLabel" SET DEFAULT 'Unrated';

-- AlterTable
ALTER TABLE "VendorSummary" ALTER COLUMN "summaryText" DROP NOT NULL,
DROP COLUMN "recurringComplaints",
ADD COLUMN     "recurringComplaints" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "reviewCountAtGeneration" SET DEFAULT 0;

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Vendor_state_idx" ON "Vendor"("state");

-- CreateIndex
CREATE INDEX "Vendor_category_idx" ON "Vendor"("category");

-- CreateIndex
CREATE INDEX "Vendor_claimStatus_idx" ON "Vendor"("claimStatus");
