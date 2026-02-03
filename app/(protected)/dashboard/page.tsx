import { prisma } from "@/lib/prisma";
import {
  generatePacket,
  recomputeDefaultTargetScores,
  upsertApplicationStatus,
} from "@/lib/actions";

export default async function DashboardPage() {
  const target = await prisma.targetProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const scores = target
    ? await prisma.jobScore.findMany({
        where: { targetProfileId: target.id },
        orderBy: { scoreNumeric: "desc" },
        include: {
          job: {
            include: {
              company: true,
              packet: true,
              applications: { orderBy: { createdAt: "desc" }, take: 1 },
            },
          },
        },
        take: 50,
      })
    : [];

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              Ranked jobs scored against target profile{" "}
              <span className="pill">{target?.name ?? "Not configured"}</span>
            </p>
          </div>
          <form action={recomputeDefaultTargetScores}>
            <button className="btn-secondary" type="submit">
              Recompute Scores
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4">
        {scores.length === 0 && (
          <div className="card p-6 text-sm text-slate-600">
            No scored jobs yet. Add jobs or import from ATS sources.
          </div>
        )}

        {scores.map((score) => {
          const job = score.job;
          const reasons = Array.isArray(score.reasonsJson)
            ? (score.reasonsJson as string[])
            : [];
          const application = job.applications[0];
          const generateAction = generatePacket.bind(null, job.id);
          const queueAction = upsertApplicationStatus.bind(null, job.id, "queued");
          const appliedAction = upsertApplicationStatus.bind(
            null,
            job.id,
            "applied"
          );
          const rejectAction = upsertApplicationStatus.bind(
            null,
            job.id,
            "rejected"
          );
          return (
            <div key={score.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    {job.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {job.company.name}
                    {job.location ? ` · ${job.location}` : ""}
                    {job.remote ? " · Remote" : ""}
                    {job.postedAt
                      ? ` · Posted ${new Date(job.postedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="pill">Score {score.scoreNumeric}</span>
                    {application && (
                      <span className="pill">Status: {application.status}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={generateAction}>
                    <button className="btn-secondary" type="submit">
                      Generate Packet
                    </button>
                  </form>
                  <form action={queueAction}>
                    <button className="btn-secondary" type="submit">
                      Start Apply Session
                    </button>
                  </form>
                  <form action={appliedAction}>
                    <button className="btn-secondary" type="submit">
                      Mark Applied
                    </button>
                  </form>
                  <form action={rejectAction}>
                    <button className="btn-secondary" type="submit">
                      Reject
                    </button>
                  </form>
                </div>
              </div>

              {reasons.length > 0 && (
                <ul className="mt-4 grid gap-1 text-sm text-slate-600">
                  {reasons.slice(0, 5).map((reason, index) => (
                    <li key={index}>• {reason}</li>
                  ))}
                </ul>
              )}

              {job.packet && (
                <div className="mt-4 text-sm text-slate-600">
                  Packet ready:{" "}
                  <a
                    href={`/packets/${job.packet.id}`}
                    className="text-accent hover:underline"
                  >
                    View packet
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
