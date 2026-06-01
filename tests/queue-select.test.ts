import { describe, expect, it } from "vitest";
import { rankQueueCandidates } from "@/lib/queue/select";

describe("rankQueueCandidates", () => {
  it("orders by score desc then postedAt desc", () => {
    const now = new Date("2026-02-01T10:00:00Z");
    const earlier = new Date("2026-01-20T10:00:00Z");
    const candidates = [
      { score: 80, postedAt: earlier },
      { score: 90, postedAt: earlier },
      { score: 80, postedAt: now },
    ];
    const ranked = rankQueueCandidates(candidates);
    expect(ranked[0].score).toBe(90);
    expect(ranked[1].postedAt?.toISOString()).toBe(now.toISOString());
  });
});
