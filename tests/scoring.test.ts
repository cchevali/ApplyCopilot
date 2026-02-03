import { describe, expect, it } from "vitest";
import { scoreJobAgainstTarget } from "@/lib/scoring";

describe("scoreJobAgainstTarget", () => {
  it("scores higher when skills overlap", () => {
    const result = scoreJobAgainstTarget({
      job: {
        title: "Senior Frontend Engineer",
        description: "React, TypeScript, and Next.js experience required.",
        location: "Arlington, VA",
        remote: false,
      },
      target: {
        roleTitles: ["Frontend Engineer"],
        includeKeywords: ["TypeScript"],
        excludeKeywords: [],
        locations: ["Arlington"],
        remoteAllowed: true,
      },
      experiences: [
        {
          bullets: ["Built React apps with TypeScript"],
          skillsTags: ["React", "TypeScript", "Next.js"],
          verified: true,
        },
      ],
    });

    expect(result.scoreNumeric).toBeGreaterThan(40);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
