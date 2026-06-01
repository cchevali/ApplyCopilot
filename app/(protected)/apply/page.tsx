import Link from "next/link";
import { AutoPacket } from "@/app/(protected)/apply/AutoPacket";
import { CopyButton } from "@/components/CopyButton";
import { generatePacket, skipJob, submitApplication } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export default async function ApplyPage() {
  const target = await prisma.targetProfile.findFirst({
    where: { name: "Northern Virginia" },
  });
  const verifiedCount = await prisma.experienceItem.count({
    where: { verified: true },
  });

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
                  packet: true,
                  scores: { where: { targetProfileId: target.id } },
                  applications: { orderBy: { createdAt: "desc" }, take: 1 },
                },
              },
            },
          },
        },
      })
    : null;

  const nextItem = queue?.items.find((item: any) => {
    const status = item.job.applications[0]?.status;
    return status !== "applied" && status !== "rejected";
  });

  if (!prismaAny.dailyQueue) {
    return (
      <section className="card border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        Daily queue tables are not available yet. Run `pnpm prisma migrate dev` then
        `pnpm prisma generate` and restart the dev server.
      </section>
    );
  }

  if (!nextItem) {
    return (
      <div className="card p-6">
        <h1 className="text-2xl font-semibold text-ink">Apply Session</h1>
        <p className="mt-2 text-sm text-slate-600">
          No queued items right now. Build today&apos;s queue or add jobs.
        </p>
        <Link className="btn-secondary mt-4 inline-flex" href="/dashboard">
          Back to Today
        </Link>
      </div>
    );
  }

  const job = nextItem.job;
  const score = job.scores[0]?.scoreNumeric ?? nextItem.score;
  const reasons = Array.isArray(job.scores[0]?.reasonsJson)
    ? (job.scores[0].reasonsJson as string[])
    : [];
  const packetAction = generatePacket.bind(null, job.id);
  const fieldPack = (job.packet?.fieldPackJson as Record<string, unknown> | undefined) ?? {};
  const githubUrl = typeof fieldPack.githubUrl === "string" ? fieldPack.githubUrl : "";

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold text-ink">Apply Session</h1>
        <p className="mt-2 text-sm text-slate-600">
          One job at a time. Open the role, copy details, submit manually, then mark done.
        </p>
      </section>

      {verifiedCount === 0 && (
        <section className="card border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Verified experience inventory is required to tailor packets.
          <Link className="ml-1 underline" href="/setup">
            Finish setup first.
          </Link>
        </section>
      )}

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">{job.title}</h2>
            <p className="text-sm text-slate-600">
              {job.company.name}
              {job.location ? ` - ${job.location}` : ""}
              {job.remote ? " - Remote" : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="pill">Score {score}</span>
            </div>
            {reasons.length > 0 && (
              <ul className="mt-2 grid gap-1 text-xs text-slate-500">
                {reasons.slice(0, 3).map((reason, index) => (
                  <li key={index}>- {reason}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {job.url && (
              <a className="btn-secondary" href={job.url} target="_blank" rel="noreferrer">
                Open Job URL
              </a>
            )}
            <Link className="btn-secondary" href="/dashboard">
              Back to Today
            </Link>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-ink">Packet And Field Pack</h3>
          {!job.packet && verifiedCount > 0 && <AutoPacket action={packetAction} />}
        </div>
        {job.packet ? (
          <div className="mt-4 space-y-3">
            <Link className="text-accent hover:underline" href={`/packets/${job.packet.id}`}>
              View full packet
            </Link>
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span>Job Title</span>
                <CopyButton text={job.title} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span>Company</span>
                <CopyButton text={job.company.name} />
              </div>
              {githubUrl && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span>GitHub Profile</span>
                  <CopyButton text={githubUrl} />
                </div>
              )}
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>Resume Variant</span>
                  <CopyButton text={job.packet.resumeVariantText} />
                </div>
                <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                  {job.packet.resumeVariantText.slice(0, 800)}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Packet will generate automatically when verified experience exists.
          </p>
        )}
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-3">
          <form action={submitApplication.bind(null, job.id)}>
            <button className="btn" type="submit">
              Submitted
            </button>
          </form>
          <form action={skipJob.bind(null, job.id, "Not a fit") }>
            <button className="btn-secondary" type="submit">
              Skip
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
