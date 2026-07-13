-- AlterTable
ALTER TABLE "ratings" ALTER COLUMN "rating" DROP NOT NULL,
ADD COLUMN     "vote" TEXT;

-- AlterTable
ALTER TABLE "tv_shows" ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "vote" TEXT;