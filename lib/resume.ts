import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export type ExperienceSuggestion = {
  company: string;
  title: string;
  startDate?: string;
  endDate?: string;
  bullets: string[];
  skillsTags: string[];
};

const commonSkills = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "python",
  "java",
  "c#",
  "sql",
  "postgresql",
  "aws",
  "azure",
  "gcp",
  "docker",
  "kubernetes",
  "terraform",
  "ci/cd",
  "git",
  "graphql",
  "rest",
  "linux",
  "agile",
  "scrum",
];

export async function extractTextFromFile(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = (file.name || "").toLowerCase();

  if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return normalizeText(result.text || "");
  }

  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return normalizeText(result.value || "");
  }

  throw new Error("Unsupported file type. Please upload PDF or DOCX.");
}

export function normalizeText(text: string) {
  return text.replace(/\r\n/g, "\n").replace(/\t/g, " ").trim();
}

export function suggestExperienceItems(text: string): ExperienceSuggestion[] {
  if (!text) {
    return [];
  }
  const sections = text
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean)
    .slice(0, 8);

  const suggestions: ExperienceSuggestion[] = [];

  for (const section of sections) {
    const lines = section
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      continue;
    }

    const header = lines[0];
    const [titlePart, companyPart] = splitHeader(header);
    const bullets = lines
      .slice(1)
      .filter((line) => line.length > 3)
      .map((line) => line.replace(/^[-•\u2022]\s*/, ""));
    const skillsTags = extractSkills(section);

    suggestions.push({
      title: titlePart || "Role",
      company: companyPart || "Company",
      bullets: bullets.slice(0, 6),
      skillsTags,
    });
  }

  return suggestions;
}

function splitHeader(header: string): [string, string] {
  const separators = [" at ", " | ", " - ", " — "];
  for (const separator of separators) {
    if (header.toLowerCase().includes(separator.trim())) {
      const parts = header.split(separator);
      if (parts.length >= 2) {
        return [parts[0].trim(), parts.slice(1).join(separator).trim()];
      }
    }
  }
  return [header.trim(), ""];
}

function extractSkills(text: string) {
  const lower = text.toLowerCase();
  const tags = commonSkills.filter((skill) => lower.includes(skill));
  return Array.from(new Set(tags)).map((tag) =>
    tag
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
