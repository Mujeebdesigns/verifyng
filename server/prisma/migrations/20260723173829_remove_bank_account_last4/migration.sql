-- DropIndex
DROP INDEX IF EXISTS "Vendor_bankAccountLast4_idx";

-- AlterTable
ALTER TABLE "Vendor" DROP COLUMN "bankAccountLast4";
