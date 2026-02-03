type ExperienceLike = {
  bullets: string[];
  skillsTags: string[];
  verified?: boolean;
};

type JobLike = {
  title: string;
  description: string;
  location?: string | null;
  remote?: boolean;
};

type TargetLike = {
  roleTitles: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  locations: string[];
  remoteAllowed: boolean;
};

type Reason = { text: string; weight: number };

export function scoreJobAgainstTarget(input: {
  job: JobLike;
  target: TargetLike;
  experiences: ExperienceLike[];
}) {
  const jobText = `${input.job.title} ${input.job.description}`.toLowerCase();
  const jobTokens = new Set(tokenize(jobText));
  const reasons: Reason[] = [];
  let score = 0;

  const verifiedExperiences = input.experiences.filter(
    (exp) => exp.verified !== false
  );
  const skillTokens = new Set<string>();

  for (const exp of verifiedExperiences) {
    for (const skill of exp.skillsTags || []) {
      const token = normalize(skill);
      if (token) {
        skillTokens.add(token);
      }
    }
    for (const bullet of exp.bullets || []) {
      tokenize(bullet)
        .filter((token) => token.length > 3)
        .forEach((token) => skillTokens.add(token));
    }
  }

  let matchCount = 0;
  for (const token of skillTokens) {
    if (jobTokens.has(token)) {
      matchCount += 1;
    }
  }

  const baseline = Math.min(60, matchCount * 5);
  if (matchCount > 0) {
    reasons.push({
      text: `Matched ${matchCount} skills or keywords from verified experience`,
      weight: 30,
    });
  } else {
    reasons.push({
      text: "No strong skill overlap with verified experience yet",
      weight: 10,
    });
  }
  score += baseline;

  const titleBoost = computeTitleBoost(
    input.job.title,
    input.target.roleTitles
  );
  if (titleBoost > 0) {
    score += titleBoost;
    reasons.push({
      text: "Job title aligns with target roles",
      weight: titleBoost,
    });
  }

  const locationBoost = computeLocationBoost(
    input.job.location,
    Boolean(input.job.remote),
    input.target.locations,
    input.target.remoteAllowed
  );
  if (locationBoost > 0) {
    score += locationBoost;
    reasons.push({
      text: locationBoost > 5 ? "Location matches target area" : "Remote-friendly",
      weight: locationBoost,
    });
  }

  const includeHits = input.target.includeKeywords.filter((keyword) =>
    jobText.includes(keyword.toLowerCase())
  );
  if (includeHits.length > 0) {
    const includeBoost = Math.min(10, includeHits.length * 2);
    score += includeBoost;
    reasons.push({
      text: `Matched target keywords: ${includeHits.slice(0, 3).join(", ")}`,
      weight: includeBoost,
    });
  }

  const excludeHits = input.target.excludeKeywords.filter((keyword) =>
    jobText.includes(keyword.toLowerCase())
  );
  if (excludeHits.length > 0) {
    const penalty = Math.min(40, excludeHits.length * 20);
    score -= penalty;
    reasons.push({
      text: `Contains excluded terms: ${excludeHits.slice(0, 3).join(", ")}`,
      weight: penalty,
    });
  }

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const topReasons = reasons
    .sort((a, b) => b.weight - a.weight)
    .map((reason) => reason.text)
    .slice(0, 5);

  return {
    scoreNumeric: normalized,
    reasons: topReasons,
  };
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function computeTitleBoost(title: string, targets: string[]) {
  if (!targets.length) {
    return 0;
  }
  const titleTokens = new Set(tokenize(title));
  let best = 0;
  for (const target of targets) {
    const targetTokens = new Set(tokenize(target));
    if (targetTokens.size === 0) {
      continue;
    }
    let overlap = 0;
    for (const token of targetTokens) {
      if (titleTokens.has(token)) {
        overlap += 1;
      }
    }
    const similarity = overlap / targetTokens.size;
    if (similarity > best) {
      best = similarity;
    }
  }
  if (best >= 0.6) {
    return 15;
  }
  if (best >= 0.35) {
    return 8;
  }
  return 0;
}

function computeLocationBoost(
  location: string | null | undefined,
  isRemote: boolean,
  targets: string[],
  remoteAllowed: boolean
) {
  if (isRemote && remoteAllowed) {
    return 6;
  }
  if (!location) {
    return 0;
  }
  const lower = location.toLowerCase();
  const match = targets.some((target) =>
    lower.includes(target.toLowerCase())
  );
  return match ? 10 : 0;
}
