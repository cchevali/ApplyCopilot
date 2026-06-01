import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function PacketPage({
  params,
}: {
  params: { id: string };
}) {
  const packet = await prisma.packet.findUnique({
    where: { id: params.id },
    include: { job: { include: { company: true } } },
  });

  if (!packet) {
    notFound();
  }

  const fieldPack = packet.fieldPackJson as Record<string, unknown>;
  const githubUrl = typeof fieldPack.githubUrl === "string" ? fieldPack.githubUrl : "";

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="text-2xl font-semibold text-ink">
          Packet for {packet.job.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {packet.job.company.name} - Generated {packet.createdAt.toLocaleString()}
        </p>
        {githubUrl && (
          <p className="mt-2 text-sm text-slate-600">GitHub: {githubUrl}</p>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Tailored Resume</h2>
        <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
          {packet.resumeVariantText}
        </pre>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Cover Letter</h2>
        <p className="mt-2 text-sm text-slate-600">
          {packet.coverLetterText ? "Draft ready." : "No cover letter generated."}
        </p>
        {packet.coverLetterText && (
          <pre className="mt-4 whitespace-pre-wrap text-sm text-slate-700">
            {packet.coverLetterText}
          </pre>
        )}
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold text-ink">Field Pack</h2>
        <p className="mt-2 text-sm text-slate-600">
          Copy and paste blocks plus audit trail for verified bullet usage.
        </p>
        <pre className="mt-4 whitespace-pre-wrap text-xs text-slate-700">
          {JSON.stringify(fieldPack, null, 2)}
        </pre>
      </section>
    </div>
  );
}
