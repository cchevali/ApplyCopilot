import { createManualJob, importGreenhouse, importLever } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export default async function JobsPage() {
  const jobs = await prisma.jobPosting.findMany({
    orderBy: { ingestedAt: "desc" },
    include: { company: true },
    take: 30,
  });

  async function importGreenhouseAction(formData: FormData) {
    "use server";
    const boardUrl = String(formData.get("boardUrl") || "");
    if (!boardUrl) return;
    await importGreenhouse(boardUrl);
  }

  async function importLeverAction(formData: FormData) {
    "use server";
    const handle = String(formData.get("handle") || "");
    if (!handle) return;
    await importLever(handle);
  }

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold text-ink">Jobs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add jobs manually or import from supported ATS sources.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-ink">Manual Entry</h2>
          <form action={createManualJob} className="mt-4 grid gap-3">
            <input
              name="company"
              className="input"
              placeholder="Company"
              required
            />
            <input
              name="title"
              className="input"
              placeholder="Job title"
              required
            />
            <input name="location" className="input" placeholder="Location" />
            <input name="url" className="input" placeholder="Job URL" />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="remote" />
              Remote role
            </label>
            <textarea
              name="description"
              className="input min-h-[140px]"
              placeholder="Paste job description"
              required
            />
            <button className="btn w-fit" type="submit">
              Add Job
            </button>
          </form>
        </div>

        <div className="card space-y-6 p-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">Import Greenhouse</h2>
            <p className="text-sm text-slate-600">
              Provide a public Greenhouse board URL. Fetches jobs with rate
              limiting.
            </p>
            <form action={importGreenhouseAction} className="mt-3 flex gap-2">
              <input
                name="boardUrl"
                className="input"
                placeholder="https://boards.greenhouse.io/company"
                required
              />
              <button className="btn" type="submit">
                Import
              </button>
            </form>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Import Lever</h2>
            <p className="text-sm text-slate-600">
              Provide a public Lever handle or URL.
            </p>
            <form action={importLeverAction} className="mt-3 flex gap-2">
              <input
                name="handle"
                className="input"
                placeholder="company or https://jobs.lever.co/company"
                required
              />
              <button className="btn" type="submit">
                Import
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Recent Jobs</h2>
        <div className="mt-4 grid gap-3">
          {jobs.length === 0 && (
            <p className="text-sm text-slate-500">No jobs added yet.</p>
          )}
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{job.title}</p>
                <p className="text-xs text-slate-600">
                  {job.company.name}
                  {job.location ? ` · ${job.location}` : ""}
                </p>
              </div>
              <span className="pill">{job.source}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
