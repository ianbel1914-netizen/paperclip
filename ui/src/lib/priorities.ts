export const REGISTER_TITLE = "Project Prioritization Register";
export const REGISTER_DOCUMENT_KEY = "priorities";

export const SCORE_FIELDS = [
  "strategic",
  "revenue",
  "readiness",
  "speed",
  "costSafety",
  "repeatability",
  "unlock",
] as const;

export type ScoreField = (typeof SCORE_FIELDS)[number];

export interface PriorityProject {
  id: string;
  project: string;
  strategic: number;
  revenue: number;
  readiness: number;
  speed: number;
  costSafety: number;
  repeatability: number;
  unlock: number;
  posture: string;
  notes: string;
}

export interface PortfolioFront {
  project: string;
  issueIdentifier: string;
  outcomeArea: string;
  stage: string;
  primaryOutcome: string;
  progressSignal: string;
  nextMilestone: string;
}

export const SCORE_LABELS: Record<ScoreField, string> = {
  strategic: "Strategic",
  revenue: "Revenue",
  readiness: "Readiness",
  speed: "Speed",
  costSafety: "Cost Safety",
  repeatability: "Repeatability",
  unlock: "Unlock",
};

export const SCORING_CRITERIA = [
  ["Strategic value", "Does this compound across Ian's work?"],
  ["Revenue immediacy", "Can it help customers, pipeline, or revenue soon?"],
  ["Data readiness", "Do we have enough data/access to start?"],
  ["Speed", "Can we ship a narrow useful version quickly?"],
  ["Cost safety", "Can we run it cheaply and safely?"],
  ["Repeatability", "Will the workflow teach Paperclip patterns reused elsewhere?"],
  ["Dependency unlock", "Does it unblock other projects?"],
] as const;

export const PORTFOLIO_FRONTS: PortfolioFront[] = [
  {
    project: "Paperclip Control Plane",
    issueIdentifier: "IAN-81",
    outcomeArea: "platform-control-plane",
    stage: "Platform gate",
    primaryOutcome: "Safe, observable, low-cost AI team infrastructure",
    progressSignal: "Quota green, tests pass, smoke issues complete",
    nextMilestone: "Codex smoke test and quota gate review",
  },
  {
    project: "Chief of Staff Office",
    issueIdentifier: "IAN-82",
    outcomeArea: "chief-of-staff",
    stage: "Design",
    primaryOutcome: "One front door for Ian",
    progressSignal: "Routing rules, briefing format, decision queue",
    nextMilestone: "CoS operating model and first daily brief template",
  },
  {
    project: "EJV Labs Revenue Engine",
    issueIdentifier: "IAN-83",
    outcomeArea: "ejv-revenue",
    stage: "Candidate pilot",
    primaryOutcome: "More customers and revenue for live ventures",
    progressSignal: "ICPs, lead lists, outreach tests, calls booked",
    nextMilestone: "Pick first venture and two-week success metric",
  },
  {
    project: "IanOS",
    issueIdentifier: "IAN-84",
    outcomeArea: "ianos",
    stage: "Product concept",
    primaryOutcome: "Dashboard for Ian's life and work",
    progressSignal: "Executive views defined, data sources connected",
    nextMilestone: "Define v0 dashboard views and source map",
  },
  {
    project: "Real Estate Portfolio Intelligence",
    issueIdentifier: "IAN-85",
    outcomeArea: "real-estate-intelligence",
    stage: "Candidate pilot",
    primaryOutcome: "Better portfolio and operating decisions for ~5,500 apartments",
    progressSignal: "Reports automated, KPIs mapped, anomalies found",
    nextMilestone: "Create portfolio data inventory and first KPI pack",
  },
  {
    project: "Acquisition Analysis Tool",
    issueIdentifier: "IAN-86",
    outcomeArea: "acquisition-analysis",
    stage: "Candidate pilot",
    primaryOutcome: "Faster MSA/deal screening",
    progressSignal: "Markets scored, deals screened, underwriting inputs mapped",
    nextMilestone: "Define MSA scoring model and data requirements",
  },
  {
    project: "FamilyOS",
    issueIdentifier: "IAN-87",
    outcomeArea: "familyos",
    stage: "Backlog",
    primaryOutcome: "Lower family coordination load",
    progressSignal: "Tasks captured, reminders completed, records organized",
    nextMilestone: "Define family intake model and privacy boundaries",
  },
  {
    project: "Venture Assessment Machine",
    issueIdentifier: "IAN-88",
    outcomeArea: "venture-assessment",
    stage: "Backlog",
    primaryOutcome: "Faster venture go/no-go and support decisions",
    progressSignal: "Viability memos, experiments designed, evidence tracked",
    nextMilestone: "Create assessment rubric and memo template",
  },
  {
    project: "Growth and Social Listening",
    issueIdentifier: "IAN-89",
    outcomeArea: "growth-intelligence",
    stage: "Backlog / paired",
    primaryOutcome: "Discover customer and market signals",
    progressSignal: "Signals collected, opportunities briefed, tests launched",
    nextMilestone: "Define low-cost listening sources and weekly brief",
  },
  {
    project: "Telegram Command Channel",
    issueIdentifier: "IAN-90",
    outcomeArea: "telegram-command",
    stage: "Platform support",
    primaryOutcome: "Mobile control surface for Paperclip",
    progressSignal: "Commands handled, audit trail preserved",
    nextMilestone: "Define allowed commands and escalation rules",
  },
  {
    project: "Local Worker Pool",
    issueIdentifier: "IAN-91",
    outcomeArea: "local-worker-pool",
    stage: "Platform experiment",
    primaryOutcome: "Cheaper background work on local mini PCs",
    progressSignal: "Tasks benchmarked, cost reduced, quality accepted",
    nextMilestone: "Pick first low-risk local benchmark task",
  },
  {
    project: "OpenClaw Memory Integration",
    issueIdentifier: "IAN-92",
    outcomeArea: "openclaw-memory",
    stage: "Platform dependency",
    primaryOutcome: "Durable memory and identity across teams",
    progressSignal: "Memory contract, recall quality, fewer repeated prompts",
    nextMilestone: "Define memory schema and sync boundary",
  },
];

export function frontForProject(project: string): PortfolioFront | null {
  const normalized = project.trim().toLowerCase();
  return PORTFOLIO_FRONTS.find((front) => front.project.toLowerCase() === normalized) ?? null;
}

export function clampScore(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(5, Math.round(value)));
}

export function totalScore(project: PriorityProject) {
  return SCORE_FIELDS.reduce((sum, field) => sum + clampScore(project[field]), 0);
}

function cleanCell(value: string) {
  return value.replace(/^\\|/, "").replace(/\\|$/, "").trim();
}

function splitMarkdownRow(line: string) {
  const trimmed = line.trim();
  const withoutOuter = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const normalized = withoutOuter.endsWith("|") ? withoutOuter.slice(0, -1) : withoutOuter;
  return normalized.split("|").map(cleanCell);
}

function parseScore(value: string) {
  const parsed = Number.parseInt(value.trim(), 10);
  return clampScore(parsed);
}

export function parsePriorityProjects(markdown: string): PriorityProject[] {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim().toLowerCase() === "## current scores");
  if (headingIndex === -1) return [];

  const rows: PriorityProject[] = [];
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i]?.trim() ?? "";
    if (line.startsWith("## ")) break;
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-/.test(line)) continue;
    if (line.toLowerCase().includes("| rank |")) continue;

    const cells = splitMarkdownRow(line);
    if (cells.length < 12) continue;
    const projectName = cells[1] ?? "";
    if (!projectName) continue;

    rows.push({
      id: `${projectName}-${rows.length}`,
      project: projectName,
      strategic: parseScore(cells[2] ?? "1"),
      revenue: parseScore(cells[3] ?? "1"),
      readiness: parseScore(cells[4] ?? "1"),
      speed: parseScore(cells[5] ?? "1"),
      costSafety: parseScore(cells[6] ?? "1"),
      repeatability: parseScore(cells[7] ?? "1"),
      unlock: parseScore(cells[8] ?? "1"),
      posture: cells[10] ?? "",
      notes: cells[11] ?? "",
    });
  }

  return rankPriorityProjects(rows);
}

export function rankPriorityProjects(projects: PriorityProject[]) {
  return [...projects].sort((a, b) => totalScore(b) - totalScore(a) || a.project.localeCompare(b.project));
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
}

export function buildPriorityMarkdown(projects: PriorityProject[], decisionNote: string) {
  const ranked = rankPriorityProjects(projects).map((project) => ({ ...project, total: totalScore(project) }));
  const today = new Date().toISOString().slice(0, 10);
  const rows = ranked.map((project, index) =>
    [
      index + 1,
      escapeTableCell(project.project),
      clampScore(project.strategic),
      clampScore(project.revenue),
      clampScore(project.readiness),
      clampScore(project.speed),
      clampScore(project.costSafety),
      clampScore(project.repeatability),
      clampScore(project.unlock),
      project.total,
      escapeTableCell(project.posture),
      escapeTableCell(project.notes),
    ].join(" | "),
  );

  return `# Project Prioritization Register

Last updated: ${today}
Owner: Ian / Codex co-pilot
Purpose: keep one live, editable view of all candidate projects and the scoring matrix used to decide what to do next.

## Scoring Criteria

| Criterion | Question |
| --- | --- |
${SCORING_CRITERIA.map(([criterion, question]) => `| ${criterion} | ${question} |`).join("\n")}

## Current Scores

| Rank | Project | Strategic | Revenue | Readiness | Speed | Cost Safety | Repeatability | Unlock | Total | Recommended Posture | Notes |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
${rows.map((row) => `| ${row} |`).join("\n")}

## Current Decision

${decisionNote.trim() || "No current decision recorded."}

## Change Log

| Date | Change | Reason |
| --- | --- | --- |
| ${today} | Scores updated in the Priorities page. | See document revision history for prior versions. |
`;
}

export function parseCurrentDecision(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => line.trim().toLowerCase() === "## current decision");
  if (headingIndex === -1) return "";
  const body: string[] = [];
  for (let i = headingIndex + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (line.trim().startsWith("## ")) break;
    body.push(line);
  }
  return body.join("\n").trim();
}

export function newPriorityProject(): PriorityProject {
  return {
    id: `new-${Date.now()}`,
    project: "New Project",
    strategic: 3,
    revenue: 3,
    readiness: 3,
    speed: 3,
    costSafety: 3,
    repeatability: 3,
    unlock: 3,
    posture: "Candidate",
    notes: "",
  };
}
