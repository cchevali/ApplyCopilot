-- CreateEnum
CREATE TYPE "JobSourceType" AS ENUM ('GREENHOUSE', 'LEVER', 'CAREERS_PAGE_JSONLD');

-- CreateEnum
CREATE TYPE "IngestStatus" AS ENUM ('SUCCESS', 'FAIL');

-- CreateTable
CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JobSourceType" NOT NULL,
    "urlOrHandle" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestRun" (
    "id" TEXT NOT NULL,
    "jobSourceId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "status" "IngestStatus" NOT NULL,
    "statsJson" JSONB NOT NULL,
    "errorText" TEXT,

    CONSTRAINT "IngestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,
    "maxItems" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyQueueItem" (
    "id" TEXT NOT NULL,
    "dailyQueueId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyQueueItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyQueue_userId_date_targetProfileId_key" ON "DailyQueue"("userId", "date", "targetProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyQueueItem_dailyQueueId_jobId_key" ON "DailyQueueItem"("dailyQueueId", "jobId");

-- AddForeignKey
ALTER TABLE "JobSource" ADD CONSTRAINT "JobSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestRun" ADD CONSTRAINT "IngestRun_jobSourceId_fkey" FOREIGN KEY ("jobSourceId") REFERENCES "JobSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQueue" ADD CONSTRAINT "DailyQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQueue" ADD CONSTRAINT "DailyQueue_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "TargetProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQueueItem" ADD CONSTRAINT "DailyQueueItem_dailyQueueId_fkey" FOREIGN KEY ("dailyQueueId") REFERENCES "DailyQueue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyQueueItem" ADD CONSTRAINT "DailyQueueItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPosting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
