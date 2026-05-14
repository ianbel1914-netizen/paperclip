import { describe, expect, it } from "vitest";
import {
  buildPriorityMarkdown,
  clampScore,
  focusBand,
  frontForProject,
  parseCurrentDecision,
  parsePriorityProjects,
  rankPriorityProjects,
  totalScore,
} from "./priorities";

const sampleMarkdown = `# Project Prioritization Register

## Current Scores

| Rank | Project | Strategic | Revenue | Readiness | Speed | Cost Safety | Repeatability | Unlock | Life Fit | Total | Recommended Posture | Notes |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | Real Estate Portfolio Intelligence | 5 | 5 | 4 | 4 | 3 | 4 | 4 | 4 | 33 | Candidate pilot | Promote if portfolio reporting need is urgent. |
| 2 | EJV Labs Revenue Engine | 5 | 5 | 3 | 4 | 3 | 5 | 4 | 3 | 32 | Next business pilot | Closest to revenue. |
| 3 | FamilyOS | 4 | 1 | 3 | 3 | 4 | 3 | 2 | 5 | 25 | Later | Valuable but less urgent. |

## Current Decision

Promote Real Estate if Ian marks it urgent.

## Change Log
`;

describe("priorities", () => {
  it("parses projects from the markdown scoring table", () => {
    const projects = parsePriorityProjects(sampleMarkdown);

    expect(projects).toHaveLength(3);
    expect(projects[0]?.project).toBe("Real Estate Portfolio Intelligence");
    expect(projects[0]?.revenue).toBe(5);
    expect(projects[0]?.lifeFit).toBe(4);
    expect(projects[2]?.project).toBe("FamilyOS");
  });

  it("clamps malformed or out-of-range scores", () => {
    expect(clampScore(9)).toBe(5);
    expect(clampScore(-2)).toBe(1);
    expect(clampScore(Number.NaN)).toBe(1);
  });

  it("calculates total score from the seven scoring fields", () => {
    const [project] = parsePriorityProjects(sampleMarkdown);
    expect(project ? totalScore(project) : null).toBe(33);
  });

  it("extracts the current decision", () => {
    expect(parseCurrentDecision(sampleMarkdown)).toBe("Promote Real Estate if Ian marks it urgent.");
  });

  it("builds markdown that can be parsed again", () => {
    const projects = parsePriorityProjects(sampleMarkdown);
    const markdown = buildPriorityMarkdown(projects, "Keep Real Estate visible.");
    const reparsed = parsePriorityProjects(markdown);

    expect(reparsed.map((project) => project.project)).toEqual([
      "Real Estate Portfolio Intelligence",
      "EJV Labs Revenue Engine",
      "FamilyOS",
    ]);
    expect(parseCurrentDecision(markdown)).toBe("Keep Real Estate visible.");
  });

  it("maps known projects to portfolio fronts", () => {
    expect(frontForProject("Real Estate Portfolio Intelligence")?.issueIdentifier).toBe("IAN-85");
    expect(frontForProject("Unknown")).toBeNull();
  });

  it("keeps old scoring tables compatible by defaulting life fit", () => {
    const oldMarkdown = sampleMarkdown.replace(" | Life Fit", "").replace(" | 4 | 33", " | 29").replace(" | 3 | 32", " | 29").replace(" | 5 | 25", " | 20");
    const [project] = parsePriorityProjects(oldMarkdown);

    expect(project?.lifeFit).toBe(3);
  });

  it("labels focus bands from rank and posture", () => {
    const [first, second, third] = rankPriorityProjects(parsePriorityProjects(sampleMarkdown));

    expect(first ? focusBand(first, 0) : null).toBe("Primary focus");
    expect(second ? focusBand(second, 1) : null).toBe("Active watch");
    expect(third ? focusBand(third, 2) : null).toBe("Backlog");
  });
});
