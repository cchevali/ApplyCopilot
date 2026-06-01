import { saveJobFromForm } from "@/lib/actions";

export default function SaveJobPage({
  searchParams,
}: {
  searchParams: { url?: string; title?: string; company?: string; location?: string };
}) {
  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold text-ink">Save Job</h1>
        <p className="mt-2 text-sm text-slate-600">
          Paste the job details. This is a compliant, user-initiated capture flow
          (no automation).
        </p>
      </section>

      <section className="card p-6">
        <form action={saveJobFromForm} className="grid gap-4">
          <div>
            <label className="label">Job URL</label>
            <input
              name="url"
              className="input"
              defaultValue={searchParams.url ?? ""}
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Company</label>
              <input
                name="company"
                className="input"
                defaultValue={searchParams.company ?? ""}
              />
            </div>
            <div>
              <label className="label">Title</label>
              <input
                name="title"
                className="input"
                defaultValue={searchParams.title ?? ""}
              />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input
              name="location"
              className="input"
              defaultValue={searchParams.location ?? ""}
            />
          </div>
          <div>
            <label className="label">Description (paste)</label>
            <textarea
              name="description"
              className="input min-h-[160px]"
              placeholder="Paste job description"
              required
            />
          </div>
          <button className="btn w-fit" type="submit">
            Save Job
          </button>
        </form>
      </section>
    </div>
  );
}

