/*
  Warnings:

  - You are about to drop the column `commentCount` on the `Comment` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'UNACTIVE');

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "commentCount";

-- AlterTable
ALTER TABLE "Likes" ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ACTIVE';
