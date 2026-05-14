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
import {
  REGISTER_DOCUMENT_KEY,
  REGISTER_TITLE,
  SCORE_FIELDS,
  SCORE_LABELS,
  SCORING_CRITERIA,
  buildPriorityMarkdown,
  clampScore,
  frontForProject,
  newPriorityProject,
  parseCurrentDecision,
  parsePriorityProjects,
  rankPriorityProjects,
  totalScore,
  type PriorityProject,
} from "@/lib/priorities";

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
    () => rankPriorityProjects(projects),
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
          {!rawMode ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {rankedProjects.slice(0, 4).map((project, index) => {
                const front = frontForProject(project.project);
                return (
                  <div key={project.id} className="border border-border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground">Rank {index + 1}</div>
                        <div className="mt-1 text-sm font-semibold">{project.project}</div>
                      </div>
                      <div className="text-lg font-semibold">{totalScore(project)}</div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{front?.stage ?? project.posture}</div>
                    <div className="mt-2 text-xs">{front?.nextMilestone ?? project.notes}</div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {rawMode ? (
            <Textarea
              value={rawBody}
              onChange={(event) => setRawBody(event.target.value)}
              className="min-h-[560px] font-mono text-xs"
            />
          ) : (
            <>
              <div className="overflow-x-auto border border-border">
                <table className="w-full min-w-[1380px] border-collapse text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Rank</th>
                      <th className="px-3 py-2 text-left font-medium">Project</th>
                      <th className="px-3 py-2 text-left font-medium">Stage</th>
                      <th className="px-3 py-2 text-left font-medium">Front</th>
                      {SCORE_FIELDS.map((field) => (
                        <th key={field} className="px-2 py-2 text-center font-medium">{SCORE_LABELS[field]}</th>
                      ))}
                      <th className="px-3 py-2 text-center font-medium">Total</th>
                      <th className="px-3 py-2 text-left font-medium">Posture</th>
                      <th className="px-3 py-2 text-left font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankedProjects.map((project, index) => {
                      const front = frontForProject(project.project);
                      return (
                        <tr key={project.id} className="border-t border-border align-top">
                          <td className="px-3 py-2 text-muted-foreground">{index + 1}</td>
                          <td className="px-3 py-2">
                            <Input
                              value={project.project}
                              onChange={(event) => updateProject(project.id, { project: event.target.value })}
                              className="h-8 min-w-[210px]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex min-w-[120px] items-center border border-border px-2 py-1 text-xs">
                              {front?.stage ?? "Unmapped"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {front ? (
                              <a className="text-xs text-primary hover:underline" href={`/${selectedCompany?.issuePrefix ?? "IAN"}/issues/${front.issueIdentifier}`}>
                                {front.issueIdentifier}
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">No front</span>
                            )}
                            <div className="mt-1 max-w-[260px] text-xs text-muted-foreground">{front?.nextMilestone}</div>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button variant="outline" size="sm" onClick={() => setProjects((current) => [...current, newPriorityProject()])}>
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
