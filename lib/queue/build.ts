import { prisma } from "@/lib/prisma";
import { rankQueueCandidates } from "@/lib/queue/select";

export async function buildDailyQueue() {
  const target = await prisma.targetProfile.findFirst({
    where: { name: "Northern Virginia" },
  });
  if (!target) {
    return null;
  }
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (!user) {
    return null;
  }

  const today = formatDate(new Date());
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const jobs = await prisma.jobPosting.findMany({
    where: {
      ingestedAt: { gte: cutoff },
      scores: {
        some: { targetProfileId: target.id },
      },
      applications: {
        none: { status: { in: ["applied", "rejected"] } },
      },
    },
    include: {
      scores: { where: { targetProfileId: target.id } },
    },
  });

  const ranked = rankQueueCandidates(
    jobs.map((job) => ({
      job,
      score: job.scores[0]?.scoreNumeric ?? 0,
      postedAt: job.postedAt ?? null,
    }))
  );

  const maxItems = 8;
  const selected = ranked.slice(0, maxItems);

  const queue = await prisma.dailyQueue.upsert({
    where: {
      userId_date_targetProfileId: {
        userId: user.id,
        date: today,
        targetProfileId: target.id,
      },
    },
    update: { maxItems },
    create: {
      userId: user.id,
      date: today,
      targetProfileId: target.id,
      maxItems,
    },
  });

  await prisma.dailyQueueItem.deleteMany({
    where: { dailyQueueId: queue.id },
  });

  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    await prisma.dailyQueueItem.create({
      data: {
        dailyQueueId: queue.id,
        jobId: item.job.id,
        rank: index + 1,
        score: item.score,
      },
    });
  }

  return queue;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
