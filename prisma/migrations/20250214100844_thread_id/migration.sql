-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_threadId_fkey";

-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "threadId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "Thread"("id") ON DELETE SET NULL ON UPDATE CASCADE;
