const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type Message = { role: "system" | "user"; content: string };

export function isAIEnabled() {
  return Boolean(OPENAI_API_KEY);
}

async function callOpenAI(messages: Message[]) {
  if (!OPENAI_API_KEY) {
    return null;
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages,
    }),
  });

  if (!response.ok) {
    return null;
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
}

export async function aiExtractExperience(text: string) {
  if (!OPENAI_API_KEY) {
    return null;
  }
  const system =
    "You extract resume experience into JSON. Only use facts present in the resume. Output JSON array with fields company, title, startDate, endDate, bullets, skillsTags.";
  const user = `Resume text:\n${text}\n\nReturn JSON only.`;
  const output = await callOpenAI([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return output;
}

export async function aiRephraseBullets(input: {
  bullets: string[];
  jobDescription: string;
}) {
  if (!OPENAI_API_KEY) {
    return null;
  }
  const system =
    "You rephrase bullet points without adding new facts. Keep the same number of bullets. Do not introduce new tools, metrics, or claims. Return JSON array of strings only.";
  const user = `Job description:\n${input.jobDescription}\n\nBullets:\n${input.bullets
    .map((bullet, index) => `${index + 1}. ${bullet}`)
    .join("\n")}\n\nReturn JSON array only.`;
  const output = await callOpenAI([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return output;
}
