import { prisma } from "@/lib/prisma";
import { updateApplicationDetails } from "@/lib/actions";

export default async function ApplicationsPage() {
  const applications = await prisma.application.findMany({
    orderBy: { updatedAt: "desc" },
    include: { job: { include: { company: true, packet: true } } },
  });

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold text-ink">Applications</h1>
        <p className="mt-2 text-sm text-slate-600">
          Track follow-ups, notes, and status changes.
        </p>
      </section>

      <div className="grid gap-4">
        {applications.length === 0 && (
          <div className="card p-6 text-sm text-slate-600">
            No applications yet. Start from the dashboard.
          </div>
        )}
        {applications.map((app) => (
          <form
            key={app.id}
            action={updateApplicationDetails}
            className="card p-6"
          >
            <input type="hidden" name="id" value={app.id} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  {app.job.title}
                </h3>
                <p className="text-sm text-slate-600">
                  {app.job.company.name}
                </p>
                {app.job.packet && (
                  <a
                    className="text-sm text-accent hover:underline"
                    href={`/packets/${app.job.packet.id}`}
                  >
                    View packet
                  </a>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="label">Status</label>
                <select
                  name="status"
                  className="input"
                  defaultValue={app.status}
                >
                  <option value="queued">queued</option>
                  <option value="applied">applied</option>
                  <option value="interview">interview</option>
                  <option value="rejected">rejected</option>
                  <option value="offer">offer</option>
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Follow-up Date</label>
                <input
                  type="date"
                  name="followUpAt"
                  className="input"
                  defaultValue={
                    app.followUpAt
                      ? app.followUpAt.toISOString().slice(0, 10)
                      : ""
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Notes</label>
                <textarea
                  name="notes"
                  className="input min-h-[100px]"
                  defaultValue={app.notes ?? ""}
                />
              </div>
            </div>
            <button className="btn mt-4" type="submit">
              Save Updates
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
