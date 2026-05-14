import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, History, ListChecks, Plus, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { issuesApi } from "@/api/issues";
import { queryKeys } from "@/lib/queryKeys";

const REGISTER_TITLE = "Project Prioritization Register";
const REGISTER_DOCUMENT_KEY = "priorities";
const SCORE_FIELDS = [
  "strategic",
  "revenue",
  "readiness",
  "speed",
  "costSafety",
  "repeatability",
  "unlock",
] as const;

type ScoreField = (typeof SCORE_FIELDS)[number];

interface PriorityProject {
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

const SCORE_LABELS: Record<ScoreField, string> = {
  strategic: "Strategic",
  revenue: "Revenue",
  readiness: "Readiness",
  speed: "Speed",
  costSafety: "Cost Safety",
  repeatability: "Repeatability",
  unlock: "Unlock",
};

const SCORING_CRITERIA = [
  ["Strategic value", "Does this compound across Ian's work?"],
  ["Revenue immediacy", "Can it help customers, pipeline, or revenue soon?"],
  ["Data readiness", "Do we have enough data/access to start?"],
  ["Speed", "Can we ship a narrow useful version quickly?"],
  ["Cost safety", "Can we run it cheaply and safely?"],
  ["Repeatability", "Will the workflow teach Paperclip patterns reused elsewhere?"],
  ["Dependency unlock", "Does it unblock other projects?"],
];

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(5, Math.round(value)));
}

function totalScore(project: PriorityProject) {
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

function parsePriorityProjects(markdown: string): PriorityProject[] {
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

  return rows.sort((a, b) => totalScore(b) - totalScore(a) || a.project.localeCompare(b.project));
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, "/").replace(/\r?\n/g, " ").trim();
}

function buildPriorityMarkdown(projects: PriorityProject[], decisionNote: string) {
  const ranked = [...projects]
    .map((project) => ({ ...project, total: totalScore(project) }))
    .sort((a, b) => b.total - a.total || a.project.localeCompare(b.project));
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

function parseCurrentDecision(markdown: string) {
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

function newProject(): PriorityProject {
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

export function Priorities() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const queryClient = useQueryClient();
  const [projects, setProjects] = useState<PriorityProject[]>([]);
  const [decisionNote, setDecisionNote] = useState("");
  const [changeSummary, setChangeSummary] = useState("Update project priority scores.");
  const [rawMode, setRawMode] = useState(false);
  const [rawBody, setRawBody] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ label: "Priorities" }]);
  }, [setBreadcrumbs]);

  const registerQuery = useQuery({
    queryKey: selectedCompanyId ? queryKeys.issues.search(selectedCompanyId, REGISTER_TITLE, undefined, 10) : ["priorities", "no-company"],
    queryFn: () => issuesApi.list(selectedCompanyId!, { q: REGISTER_TITLE, limit: 10 }),
    enabled: !!selectedCompanyId,
  });

  const registerIssue = useMemo(
    () => registerQuery.data?.find((issue) => issue.title === REGISTER_TITLE) ?? registerQuery.data?.[0] ?? null,
    [registerQuery.data],
  );

  const documentQuery = useQuery({
    queryKey: registerIssue ? queryKeys.issues.document(registerIssue.id, REGISTER_DOCUMENT_KEY) : ["priorities", "document", "none"],
    queryFn: () => issuesApi.getDocument(registerIssue!.id, REGISTER_DOCUMENT_KEY),
    enabled: !!registerIssue,
  });

  const revisionsQuery = useQuery({
    queryKey: registerIssue ? queryKeys.issues.documentRevisions(registerIssue.id, REGISTER_DOCUMENT_KEY) : ["priorities", "revisions", "none"],
    queryFn: () => issuesApi.listDocumentRevisions(registerIssue!.id, REGISTER_DOCUMENT_KEY),
    enabled: !!registerIssue,
  });

  useEffect(() => {
    if (!documentQuery.data?.body) return;
    setProjects(parsePriorityProjects(documentQuery.data.body));
    setDecisionNote(parseCurrentDecision(documentQuery.data.body));
    setRawBody(documentQuery.data.body);
  }, [documentQuery.data?.body]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!registerIssue || !documentQuery.data) {
        throw new Error("Priority register is not ready.");
      }
      const body = rawMode ? rawBody : buildPriorityMarkdown(projects, decisionNote);
      return issuesApi.upsertDocument(registerIssue.id, REGISTER_DOCUMENT_KEY, {
        title: REGISTER_TITLE,
        format: "markdown",
        body,
        changeSummary,
        baseRevisionId: documentQuery.data.latestRevisionId,
      });
    },
    onSuccess: async () => {
      if (!registerIssue || !selectedCompanyId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.document(registerIssue.id, REGISTER_DOCUMENT_KEY) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.documentRevisions(registerIssue.id, REGISTER_DOCUMENT_KEY) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.search(selectedCompanyId, REGISTER_TITLE, undefined, 10) }),
      ]);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (revisionId: string) => {
      if (!registerIssue) throw new Error("Priority register is not ready.");
      return issuesApi.restoreDocumentRevision(registerIssue.id, REGISTER_DOCUMENT_KEY, revisionId);
    },
    onSuccess: async () => {
      if (!registerIssue) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.document(registerIssue.id, REGISTER_DOCUMENT_KEY) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.issues.documentRevisions(registerIssue.id, REGISTER_DOCUMENT_KEY) }),
      ]);
    },
  });

  const rankedProjects = useMemo(
    () => [...projects].sort((a, b) => totalScore(b) - totalScore(a) || a.project.localeCompare(b.project)),
    [projects],
  );

  function updateProject(id: string, patch: Partial<PriorityProject>) {
    setProjects((current) => current.map((project) => (project.id === id ? { ...project, ...patch } : project)));
  }

  if (!selectedCompanyId) {
    return <EmptyState icon={ListChecks} message="Select a company to view priorities." />;
  }

  if (registerQuery.isLoading || documentQuery.isLoading) {
    return <PageSkeleton variant="list" />;
  }

  if (!registerIssue) {
    return (
      <EmptyState
        icon={ListChecks}
        message="No project prioritization register found. Create IAN-79 first."
      />
    );
  }

  const registerHref = `/${selectedCompany?.issuePrefix ?? "issues"}/issues/${registerIssue.identifier ?? registerIssue.id}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Priorities</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Live project scoring for {selectedCompany?.name ?? "this company"}. Saves update the Paperclip document and preserve revision history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={registerHref}>
              <ExternalLink className="h-4 w-4" />
              Open Issue
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setRawMode((value) => !value)}>
            {rawMode ? "Table View" : "Raw Markdown"}
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {documentQuery.error ? (
        <div className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(documentQuery.error as Error).message}
        </div>
      ) : null}

      {saveMutation.error ? (
        <div className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {(saveMutation.error as Error).message}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          {rawMode ? (
            <Textarea
              value={rawBody}
              onChange={(event) => setRawBody(event.target.value)}
              className="min-h-[560px] font-mono text-xs"
            />
          ) : (
            <>
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[1100px] border-collapse text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Rank</th>
                      <th className="px-3 py-2 text-left font-medium">Project</th>
                      {SCORE_FIELDS.map((field) => (
                        <th key={field} className="px-2 py-2 text-center font-medium">{SCORE_LABELS[field]}</th>
                      ))}
                      <th className="px-3 py-2 text-center font-medium">Total</th>
                      <th className="px-3 py-2 text-left font-medium">Posture</th>
                      <th className="px-3 py-2 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedProjects.map((project, index) => (
                      <tr key={project.id} className="border-t border-border align-top">
                        <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-2">
                          <Input
                            value={project.project}
                            onChange={(event) => updateProject(project.id, { project: event.target.value })}
                            className="h-8 min-w-[210px]"
                          />
                        </td>
                        {SCORE_FIELDS.map((field) => (
                          <td key={field} className="px-2 py-2">
                            <Input
                              type="number"
                              min={1}
                              max={5}
                              value={project[field]}
                              onChange={(event) => updateProject(project.id, { [field]: clampScore(Number(event.target.value)) })}
                              className="h-8 w-16 text-center"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold">{totalScore(project)}</td>
                        <td className="px-3 py-2">
                          <Input
                            value={project.posture}
                            onChange={(event) => updateProject(project.id, { posture: event.target.value })}
                            className="h-8 min-w-[150px]"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={project.notes}
                            onChange={(event) => updateProject(project.id, { notes: event.target.value })}
                            className="h-8 min-w-[260px]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" onClick={() => setProjects((current) => [...current, newProject()])}>
                  <Plus className="h-4 w-4" />
                  Add Project
                </Button>
                <div className="text-xs text-muted-foreground">
                  Scores are 1-5. Rank recalculates from the total score.
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="priority-decision">Current Decision</label>
                <Textarea
                  id="priority-decision"
                  value={decisionNote}
                  onChange={(event) => setDecisionNote(event.target.value)}
                  className="min-h-24"
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="priority-change-summary">Change Summary</label>
            <Input
              id="priority-change-summary"
              value={changeSummary}
              onChange={(event) => setChangeSummary(event.target.value)}
            />
          </div>
        </section>

        <aside className="space-y-4">
          <div className="border border-border p-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">History</h2>
            </div>
            <div className="mt-3 space-y-2">
              {(revisionsQuery.data ?? []).slice(0, 8).map((revision) => (
                <div key={revision.id} className="border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">Revision {revision.revisionNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(revision.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      title="Restore revision"
                      onClick={() => restoreMutation.mutate(revision.id)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                  {revision.changeSummary ? (
                    <p className="mt-2 text-xs text-muted-foreground">{revision.changeSummary}</p>
                  ) : null}
                </div>
              ))}
              {revisionsQuery.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No revisions yet.</p>
              ) : null}
            </div>
          </div>

          <div className="border border-border p-4">
            <h2 className="text-sm font-semibold">Criteria</h2>
            <dl className="mt-3 space-y-3">
              {SCORING_CRITERIA.map(([criterion, question]) => (
                <div key={criterion}>
                  <dt className="text-xs font-medium">{criterion}</dt>
                  <dd className="mt-0.5 text-xs text-muted-foreground">{question}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
