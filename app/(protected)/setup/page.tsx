import {
  createExperienceItem,
  createJobSource,
  deleteExperienceItem,
  deleteJobSource,
  generateExperienceSuggestions,
  runRefreshNow,
  toggleJobSource,
  updateExperienceItem,
  updateProfileLinks,
  updateTargetProfile,
  uploadResume,
} from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export default async function SetupPage() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { githubUrl: true },
  });
  const resume = await prisma.resume.findFirst({
    orderBy: { createdAt: "desc" },
  });
  const experiences = await prisma.experienceItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  const target = await prisma.targetProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });

  const prismaAny = prisma as any;
  const sources = prismaAny.jobSource
    ? await prismaAny.jobSource.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          runs: { orderBy: { startedAt: "desc" }, take: 1 },
        },
      })
    : [];

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <h2 className="text-xl font-semibold text-ink">Profile Links</h2>
        <p className="mt-2 text-sm text-slate-600">
          Add your GitHub profile so packet field packs can include it.
        </p>
        <form action={updateProfileLinks} className="mt-4 grid gap-3 md:max-w-xl">
          <input
            className="input"
            type="url"
            name="githubUrl"
            placeholder="https://github.com/your-handle"
            defaultValue={user?.githubUrl ?? ""}
          />
          <button className="btn w-fit" type="submit">
            Save Profile Links
          </button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold text-ink">Step 1 - Upload Resume</h2>
        <p className="mt-2 text-sm text-slate-600">
          Upload the latest PDF or DOCX. Text is extracted and stored locally.
        </p>
        <form
          action={uploadResume}
          className="mt-4 space-y-3"
          encType="multipart/form-data"
        >
          <input
            className="input"
            type="file"
            name="resume"
            accept=".pdf,.docx"
            required
          />
          <button className="btn" type="submit">
            Upload Resume
          </button>
        </form>
        {resume && (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="label mb-2">Extracted Preview</p>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-600">
              {resume.extractedText.slice(0, 1200)}
            </pre>
          </div>
        )}
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">
              Step 2 - Experience Inventory
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Confirm verified items and edit bullets. Tailoring will only use
              verified items.
            </p>
          </div>
          <form action={generateExperienceSuggestions}>
            <button className="btn-secondary" type="submit">
              Auto-suggest from Resume
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4">
          {experiences.length === 0 && (
            <p className="text-sm text-slate-500">
              No experience items yet. Add one below or auto-suggest.
            </p>
          )}
          {experiences.map((exp) => (
            <form
              key={exp.id}
              action={updateExperienceItem}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <input type="hidden" name="id" value={exp.id} />
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Company</label>
                  <input
                    name="company"
                    className="input"
                    defaultValue={exp.company}
                  />
                </div>
                <div>
                  <label className="label">Title</label>
                  <input
                    name="title"
                    className="input"
                    defaultValue={exp.title}
                  />
                </div>
                <div>
                  <label className="label">Start Date</label>
                  <input
                    name="startDate"
                    className="input"
                    defaultValue={exp.startDate ?? ""}
                  />
                </div>
                <div>
                  <label className="label">End Date</label>
                  <input
                    name="endDate"
                    className="input"
                    defaultValue={exp.endDate ?? ""}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Bullets (one per line)</label>
                  <textarea
                    name="bullets"
                    className="input min-h-[100px]"
                    defaultValue={(exp.bullets as string[]).join("\n")}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label">Skills Tags (comma or line)</label>
                  <textarea
                    name="skillsTags"
                    className="input min-h-[80px]"
                    defaultValue={exp.skillsTags.join(", ")}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    name="verified"
                    type="checkbox"
                    defaultChecked={exp.verified}
                  />
                  Verified
                </label>
                <div className="flex gap-2">
                  <button className="btn-secondary" type="submit">
                    Save
                  </button>
                  <button
                    className="btn-secondary"
                    type="submit"
                    formAction={deleteExperienceItem}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </form>
          ))}
        </div>

        <form action={createExperienceItem} className="mt-6 grid gap-3">
          <h3 className="text-base font-semibold text-ink">Add Manual Item</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="company"
              className="input"
              placeholder="Company"
              required
            />
            <input
              name="title"
              className="input"
              placeholder="Title"
              required
            />
            <input name="startDate" className="input" placeholder="Start Date" />
            <input name="endDate" className="input" placeholder="End Date" />
            <textarea
              name="bullets"
              className="input md:col-span-2 min-h-[100px]"
              placeholder="Bullets (one per line)"
            />
            <textarea
              name="skillsTags"
              className="input md:col-span-2 min-h-[80px]"
              placeholder="Skills tags (comma or line separated)"
            />
          </div>
          <button className="btn w-fit" type="submit">
            Add Experience Item
          </button>
        </form>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold text-ink">Step 3 - Target Profile</h2>
        <p className="mt-2 text-sm text-slate-600">
          Configure Northern Virginia focus, role titles, and keyword filters.
        </p>
        <form action={updateTargetProfile} className="mt-4 grid gap-4">
          <input type="hidden" name="id" value={target?.id ?? ""} />
          <div>
            <label className="label">Profile Name</label>
            <input
              name="name"
              className="input"
              defaultValue={target?.name ?? "Northern Virginia"}
            />
          </div>
          <div>
            <label className="label">Locations (one per line)</label>
            <textarea
              name="locations"
              className="input min-h-[100px]"
              defaultValue={(target?.locations ?? []).join("\n")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              name="remoteAllowed"
              type="checkbox"
              defaultChecked={target?.remoteAllowed ?? true}
            />
            Remote allowed
          </label>
          <div>
            <label className="label">Role Titles (one per line)</label>
            <textarea
              name="roleTitles"
              className="input min-h-[80px]"
              defaultValue={(target?.roleTitles ?? []).join("\n")}
            />
          </div>
          <div>
            <label className="label">Include Keywords (one per line)</label>
            <textarea
              name="includeKeywords"
              className="input min-h-[80px]"
              defaultValue={(target?.includeKeywords ?? []).join("\n")}
            />
          </div>
          <div>
            <label className="label">Exclude Keywords (one per line)</label>
            <textarea
              name="excludeKeywords"
              className="input min-h-[80px]"
              defaultValue={(target?.excludeKeywords ?? []).join("\n")}
            />
          </div>
          <button className="btn w-fit" type="submit">
            Save Target Profile
          </button>
        </form>
      </section>

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">Job Sources</h2>
            <p className="mt-2 text-sm text-slate-600">
              Add Greenhouse, Lever, or Careers Page JSON-LD sources for daily
              refresh.
            </p>
          </div>
          <form action={runRefreshNow}>
            <button className="btn-secondary" type="submit">
              Run refresh now
            </button>
          </form>
        </div>

        {!prismaAny.jobSource && (
          <p className="mt-4 text-sm text-amber-700">
            Job sources require running the latest database migration and Prisma
            generate.
          </p>
        )}

        <div className="mt-6 grid gap-4">
          {sources.length === 0 && (
            <p className="text-sm text-slate-500">No sources configured yet.</p>
          )}
          {sources.map((source: any) => {
            const lastRun = source.runs[0];
            return (
              <form
                key={source.id}
                action={toggleJobSource}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <input type="hidden" name="id" value={source.id} />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">{source.name}</p>
                    <p className="text-xs text-slate-600">
                      {source.type} - {source.urlOrHandle}
                    </p>
                    {lastRun && (
                      <p className="text-xs text-slate-500">
                        Last run: {new Date(lastRun.startedAt).toLocaleString()} -{" "}
                        {lastRun.status}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        name="isEnabled"
                        type="checkbox"
                        defaultChecked={source.isEnabled}
                      />
                      Enabled
                    </label>
                    <button className="btn-secondary" type="submit">
                      Save
                    </button>
                    <button
                      className="btn-secondary"
                      type="submit"
                      formAction={deleteJobSource}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </form>
            );
          })}
        </div>

        <form action={createJobSource} className="mt-6 grid gap-3">
          <h3 className="text-base font-semibold text-ink">Add Job Source</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              name="name"
              className="input"
              placeholder="Source name (e.g., Acme Careers)"
              required
            />
            <select name="type" className="input" defaultValue="GREENHOUSE">
              <option value="GREENHOUSE">Greenhouse</option>
              <option value="LEVER">Lever</option>
              <option value="CAREERS_PAGE_JSONLD">Careers Page JSON-LD</option>
            </select>
            <input
              name="urlOrHandle"
              className="input md:col-span-2"
              placeholder="Board URL / handle / page URL"
              required
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="isEnabled" defaultChecked />
              Enabled
            </label>
          </div>
          <button className="btn w-fit" type="submit">
            Add Source
          </button>
        </form>
      </section>
    </div>
  );
}
