import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  generatePacket,
  recomputeDefaultTargetScores,
  skipJob,
  upsertApplicationStatus,
} from "@/lib/actions";

export default async function DashboardPage() {
  const target = await prisma.targetProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const scores = target
    ? await prisma.jobScore.findMany({
        where: { targetProfileId: target.id },
        orderBy: [{ scoreNumeric: "desc" }, { createdAt: "desc" }],
        include: {
          job: {
            include: {
              company: true,
              packet: true,
              applications: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
        take: 30,
      })
    : [];

  const today = new Date().toISOString().slice(0, 10);
  const prismaAny = prisma as any;
  const queue = target && prismaAny.dailyQueue
    ? await prismaAny.dailyQueue.findFirst({
        where: { date: today, targetProfileId: target.id },
        include: {
          items: {
            orderBy: { rank: "asc" },
            include: {
              job: {
                include: {
                  company: true,
                  scores: { where: { targetProfileId: target.id } },
                  applications: { orderBy: { createdAt: "desc" }, take: 1 },
                },
              },
            },
          },
        },
      })
    : null;

  const queueItems = (queue?.items ?? []).filter((item: any) => {
    const status = item.job.applications[0]?.status;
    return status !== "applied" && status !== "rejected";
  });

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Today</h1>
            <p className="mt-2 text-sm text-slate-600">
              Your daily queue and top matches for {target?.name ?? "your target profile"}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn" href="/apply">
              Start Apply Session
            </Link>
            <Link className="btn-secondary" href="/setup">
              Setup
            </Link>
          </div>
        </div>
      </section>

      {!prismaAny.dailyQueue && (
        <section className="card border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Daily queue tables are not available yet. Run `pnpm prisma migrate dev` then
          `pnpm prisma generate` and restart `pnpm dev`.
        </section>
      )}

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">Today&apos;s Queue</h2>
            <p className="mt-2 text-sm text-slate-600">Top jobs auto-picked for {today}.</p>
          </div>
          <form action={recomputeDefaultTargetScores}>
            <button className="btn-secondary" type="submit">
              Recompute Scores
            </button>
          </form>
        </div>

        <div className="mt-4 grid gap-3">
          {queueItems.length === 0 ? (
            <p className="text-sm text-slate-500">
              No queue items yet. Run refresh from Setup or add jobs manually.
            </p>
          ) : (
            queueItems.map((item: any) => {
              const job = item.job;
              const reasons = Array.isArray(job.scores[0]?.reasonsJson)
                ? (job.scores[0].reasonsJson as string[])
                : [];

              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{job.title}</p>
                    <p className="text-xs text-slate-600">
                      {job.company.name}
                      {job.location ? ` - ${job.location}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="pill">Score {item.score}</span>
                    </div>
                    {reasons.length > 0 && (
                      <ul className="mt-2 grid gap-1 text-xs text-slate-500">
                        {reasons.slice(0, 3).map((reason, index) => (
                          <li key={index}>- {reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link className="btn-secondary" href="/apply">
                      Apply
                    </Link>
                    <form action={skipJob.bind(null, job.id, "Not a fit") }>
                      <button className="btn-secondary" type="submit">
                        Skip
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Other Ranked Jobs</h2>
        <p className="mt-2 text-sm text-slate-600">
          Extra options outside today&apos;s queue.
        </p>
        <div className="mt-4 grid gap-3">
          {scores.length === 0 && (
            <p className="text-sm text-slate-500">No scored jobs yet.</p>
          )}
          {scores.map((score) => {
            const job = score.job;
            const queueAction = upsertApplicationStatus.bind(null, job.id, "queued");
            return (
              <div key={score.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">{job.title}</p>
                    <p className="text-xs text-slate-600">
                      {job.company.name}
                      {job.location ? ` - ${job.location}` : ""}
                    </p>
                    <span className="mt-2 inline-flex pill">Score {score.scoreNumeric}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={generatePacket.bind(null, job.id)}>
                      <button className="btn-secondary" type="submit">
                        Generate Packet
                      </button>
                    </form>
                    <form action={queueAction}>
                      <button className="btn-secondary" type="submit">
                        Add To Queue
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
