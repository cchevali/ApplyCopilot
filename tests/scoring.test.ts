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

  it("adds a small boost when a role mentions git or github", () => {
    const baseInput = {
      target: {
        roleTitles: ["Help Desk"],
        includeKeywords: [],
        excludeKeywords: [],
        locations: ["Arlington"],
        remoteAllowed: true,
      },
      experiences: [
        {
          bullets: ["Handled ticket triage and password resets"],
          skillsTags: ["ticketing", "windows"],
          verified: true,
        },
      ],
    };

    const withoutGit = scoreJobAgainstTarget({
      ...baseInput,
      job: {
        title: "Help Desk Technician",
        description: "Windows support and ticket handling required.",
        location: "Arlington, VA",
        remote: false,
      },
    });

    const withGit = scoreJobAgainstTarget({
      ...baseInput,
      job: {
        title: "Help Desk Technician",
        description:
          "Windows support, ticket handling, and basic Git/GitHub workflow.",
        location: "Arlington, VA",
        remote: false,
      },
    });

    expect(withGit.scoreNumeric).toBeGreaterThan(withoutGit.scoreNumeric);
    expect(withGit.reasons.some((r) => r.includes("Git/GitHub"))).toBe(true);
  });
});
