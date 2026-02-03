import { aiRephraseBullets, isAIEnabled } from "./ai";

type ExperienceLike = {
  id?: string;
  company: string;
  title: string;
  bullets: string[];
  skillsTags: string[];
  verified?: boolean;
};

type JobLike = {
  title: string;
  description: string;
};

type AuditEntry = {
  company: string;
  title: string;
  originalBullets: string[];
  selectedBullets: string[];
};

export async function buildResumeVariant(input: {
  job: JobLike;
  experiences: ExperienceLike[];
}) {
  const verified = input.experiences.filter((exp) => exp.verified !== false);
  const jobTokens = new Set(tokenize(`${input.job.title} ${input.job.description}`));

  const ranked = verified
    .map((exp) => ({
      exp,
      score: scoreExperience(exp, jobTokens),
    }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked.slice(0, 4).map((item) => item.exp);
  const auditTrail: AuditEntry[] = [];
  const resumeSections: string[] = [];

  for (const exp of selected) {
    const bullets = selectBullets(exp, jobTokens).slice(0, 4);
    let finalBullets = bullets;

    if (isAIEnabled() && bullets.length > 0) {
      const rephrased = await aiRephraseBullets({
        bullets,
        jobDescription: input.job.description,
      });
      try {
        const parsed = rephrased ? JSON.parse(rephrased) : null;
        if (Array.isArray(parsed) && parsed.length === bullets.length) {
          finalBullets = parsed.map((item) => String(item));
        }
      } catch {
        finalBullets = bullets;
      }
    }

    auditTrail.push({
      company: exp.company,
      title: exp.title,
      originalBullets: bullets,
      selectedBullets: finalBullets,
    });

    resumeSections.push(`${exp.company} — ${exp.title}`);
    for (const bullet of finalBullets) {
      resumeSections.push(`- ${bullet}`);
    }
    resumeSections.push("");
  }

  return {
    resumeVariantText: resumeSections.join("\n").trim(),
    auditTrail,
  };
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreExperience(exp: ExperienceLike, jobTokens: Set<string>) {
  let score = 0;
  for (const skill of exp.skillsTags) {
    if (jobTokens.has(skill.toLowerCase())) {
      score += 2;
    }
  }
  for (const bullet of exp.bullets) {
    for (const token of tokenize(bullet)) {
      if (jobTokens.has(token)) {
        score += 1;
      }
    }
  }
  return score;
}

function selectBullets(exp: ExperienceLike, jobTokens: Set<string>) {
  return exp.bullets
    .map((bullet) => ({
      bullet,
      score: tokenize(bullet).filter((token) => jobTokens.has(token)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.bullet);
}
