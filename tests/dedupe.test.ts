import { describe, expect, it } from "vitest";
import { computeJobHash } from "@/lib/dedupe";

describe("computeJobHash", () => {
  it("produces stable hashes for same input", () => {
    const hash1 = computeJobHash({
      url: "https://example.com/job",
      title: "Software Engineer",
      company: "ExampleCo",
      location: "Reston, VA",
    });
    const hash2 = computeJobHash({
      url: "https://example.com/job",
      title: "Software Engineer",
      company: "ExampleCo",
      location: "Reston, VA",
    });
    expect(hash1).toBe(hash2);
  });
});
