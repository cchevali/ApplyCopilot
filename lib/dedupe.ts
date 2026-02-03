import crypto from "crypto";

export function computeJobHash(input: {
  url?: string | null;
  title: string;
  company: string;
  location?: string | null;
}) {
  const base = [input.url, input.title, input.company, input.location]
    .filter(Boolean)
    .join("|")
    .toLowerCase()
    .trim();
  return crypto.createHash("sha256").update(base).digest("hex");
}
