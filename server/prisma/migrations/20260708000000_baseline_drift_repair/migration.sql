-- Baseline repair: captures schema changes that were previously applied
-- directly to the database (via `prisma db push`) outside migration history.

-- AlterTable
ALTER TABLE "ContactMessage" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "subject" SET DATA TYPE VARCHAR(200),
ALTER COLUMN "message" SET DATA TYPE VARCHAR(5000);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "logoImage" TEXT;
