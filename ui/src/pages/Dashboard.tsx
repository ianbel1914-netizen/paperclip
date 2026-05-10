import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard";
import { activityApi } from "../api/activity";
import { accessApi } from "../api/access";
import { costsApi } from "../api/costs";
import { issuesApi } from "../api/issues";
import { agentsApi } from "../api/agents";
import { projectsApi } from "../api/projects";
import { buildCompanyUserProfileMap } from "../lib/company-members";
import { useCompany } from "../context/CompanyContext";
import { useDialogActions } from "../context/DialogContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { MetricCard } from "../components/MetricCard";
import { EmptyState } from "../components/EmptyState";
import { StatusIcon } from "../components/StatusIcon";

import { ActivityRow } from "../components/ActivityRow";
import { Identity } from "../components/Identity";
import { timeAgo } from "../lib/timeAgo";
import { cn, formatCents } from "../lib/utils";
import { Bot, CircleDot, DollarSign, ShieldCheck, LayoutDashboard, PauseCircle, Route, Target } from "lucide-react";
import { ActiveAgentsPanel } from "../components/ActiveAgentsPanel";
import { ChartCard, RunActivityChart, PriorityChart, IssueStatusChart, SuccessRateChart } from "../components/ActivityCharts";
import { PageSkeleton } from "../components/PageSkeleton";
import { ClaudeSubscriptionPanel } from "../components/ClaudeSubscriptionPanel";
import { CodexSubscriptionPanel } from "../components/CodexSubscriptionPanel";
import type { Agent, DashboardOutcomeArea, DashboardWorkerRoute, Issue, ProviderQuotaResult, QuotaWindow } from "@paperclipai/shared";
import { PluginSlotOutlet } from "@/plugins/slots";

const DASHBOARD_ACTIVITY_LIMIT = 10;

function getRecentIssues(issues: Issue[]): Issue[] {
  return [...issues]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function formatOutcomeLabel(billingCode: string): string {
  if (billingCode === "uncategorized") return "Uncategorized";
  return billingCode
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 10 ? 2 : 4,
    maximumFractionDigits: value >= 10 ? 2 : 4,
  });
}

function formatCompactNumber(value: number): string {
  return value.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 1 });
}

function totalRouteCostUsd(routes: DashboardWorkerRoute[]): number {
  return routes.reduce((sum, route) => sum + route.costUsd, 0);
}

function providerLabel(provider: string): string {
  if (provider === "anthropic") return "Claude";
  if (provider === "openai") return "Codex";
  return provider;
}

function highestUsedPercent(windows: QuotaWindow[]): number | null {
  const values = windows
    .map((window) => window.usedPercent)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : null;
}

function quotaTone(result: ProviderQuotaResult | null): "ok" | "warn" | "danger" | "unknown" {
  if (!result || !result.ok) return "unknown";
  const maxUsed = highestUsedPercent(result.windows);
  if (maxUsed == null) return "unknown";
  if (maxUsed >= 90) return "danger";
  if (maxUsed >= 70) return "warn";
  return "ok";
}

function quotaToneClass(tone: "ok" | "warn" | "danger" | "unknown"): string {
  switch (tone) {
    case "danger":
      return "bg-red-400";
    case "warn":
      return "bg-amber-400";
    case "ok":
      return "bg-emerald-500";
    default:
      return "bg-muted-foreground/40";
  }
}

function quotaSummary(result: ProviderQuotaResult | null): string {
  if (!result) return "Not reported";
  if (!result.ok) return result.error ?? "Quota unavailable";
  const maxUsed = highestUsedPercent(result.windows);
  if (maxUsed == null) return result.windows.length > 0 ? "Limits reported" : "No windows reported";
  return `${maxUsed}% max used`;
}

function QuotaHealthPanel({
  quotaData,
  quotaLoading,
  quotaError,
}: {
  quotaData?: ProviderQuotaResult[];
  quotaLoading: boolean;
  quotaError: unknown;
}) {
  const anthropic = quotaData?.find((result) => result.provider === "anthropic") ?? null;
  const openai = quotaData?.find((result) => result.provider === "openai") ?? null;
  const providers = [anthropic, openai].filter((result): result is ProviderQuotaResult => result != null);
  const fetchError = quotaError instanceof Error ? quotaError.message : null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Quota Watch</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live Claude and Codex subscription windows. Treat missing data as an operational risk.
          </p>
        </div>
        <Link to="/costs" className="text-xs font-medium text-muted-foreground underline underline-offset-2">
          Provider detail
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="border border-border px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(["anthropic", "openai"] as const).map((provider) => {
              const result = provider === "anthropic" ? anthropic : openai;
              const tone = quotaTone(result);
              return (
                <div key={provider} className="border border-border px-3.5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{providerLabel(provider)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {quotaLoading ? "Checking quota..." : quotaSummary(result)}
                      </div>
                    </div>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${quotaToneClass(tone)}`} />
                  </div>
                </div>
              );
            })}
          </div>
          {fetchError ? (
            <div className="mt-3 border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {fetchError}
            </div>
          ) : null}
          {!quotaLoading && !fetchError && providers.length === 0 ? (
            <div className="mt-3 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              No quota provider returned data. Do not resume heavy autonomous work until Claude and Codex quota checks are visible.
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          {anthropic ? (
            <ClaudeSubscriptionPanel
              windows={anthropic.ok ? anthropic.windows : []}
              source={anthropic.source}
              error={anthropic.ok ? null : anthropic.error ?? "Claude quota unavailable"}
            />
          ) : null}
          {openai ? (
            <CodexSubscriptionPanel
              windows={openai.ok ? openai.windows : []}
              source={openai.source}
              error={openai.ok ? null : openai.error ?? "Codex quota unavailable"}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function OutcomeAreaRow({ area }: { area: DashboardOutcomeArea }) {
  const activeCount = area.open;
  const donePercent = area.total > 0 ? Math.round((area.done / area.total) * 100) : 0;
  return (
    <div className="grid gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{formatOutcomeLabel(area.billingCode)}</span>
          <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {area.billingCode}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {activeCount} active · {area.blocked} blocked · {area.done} done
        </div>
      </div>
      <div className="flex items-center gap-3 sm:justify-end">
        <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-emerald-500" style={{ width: `${donePercent}%` }} />
        </div>
        <div className="w-12 text-right text-xs tabular-nums text-muted-foreground">{donePercent}%</div>
      </div>
    </div>
  );
}

function WorkerRouteRow({ route }: { route: DashboardWorkerRoute }) {
  const profile = route.requestedModelProfile ?? "none";
  const totalTokens = route.inputTokens + route.cachedInputTokens + route.outputTokens;
  return (
    <div className="grid gap-3 border-t border-border px-4 py-3 first:border-t-0 lg:grid-cols-[minmax(0,1fr)_repeat(4,auto)] lg:items-center">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{route.model}</div>
        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{route.adapterType}</span>
          <span>profile {profile}</span>
          {route.fallbackCount > 0 ? <span className="text-amber-500">{route.fallbackCount} fallback blocks</span> : null}
        </div>
      </div>
      <div className="text-xs tabular-nums text-muted-foreground lg:w-20 lg:text-right">{route.total} runs</div>
      <div className="text-xs tabular-nums text-muted-foreground lg:w-20 lg:text-right">{route.successRatePercent}% win</div>
      <div className="text-xs tabular-nums text-muted-foreground lg:w-20 lg:text-right">{formatUsd(route.costUsd)}</div>
      <div className="text-xs tabular-nums text-muted-foreground lg:w-20 lg:text-right">{formatCompactNumber(totalTokens)} tok</div>
    </div>
  );
}

function OutcomeMeasurementPanel({
  outcomeAreas,
  workerRoutes,
  routeWindowDays,
}: {
  outcomeAreas: DashboardOutcomeArea[];
  workerRoutes: DashboardWorkerRoute[];
  routeWindowDays: number;
}) {
  const visibleAreas = outcomeAreas.slice(0, 6);
  const visibleRoutes = workerRoutes.slice(0, 5);
  const openOutcomes = outcomeAreas.reduce((sum, area) => sum + area.open, 0);
  const blockedOutcomes = outcomeAreas.reduce((sum, area) => sum + area.blocked, 0);
  const routeCostUsd = totalRouteCostUsd(workerRoutes);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Outcome Measurement</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Work grouped by business outcome and worker route, so cost can be judged against progress.
          </p>
        </div>
        <Link to="/costs" className="text-xs font-medium text-muted-foreground underline underline-offset-2">
          Cost detail
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Outcome Areas</h3>
            </div>
            <div className="text-xs text-muted-foreground">
              {openOutcomes} open · {blockedOutcomes} blocked
            </div>
          </div>
          {visibleAreas.length > 0 ? (
            <div>
              {visibleAreas.map((area) => (
                <OutcomeAreaRow key={area.billingCode} area={area} />
              ))}
            </div>
          ) : (
            <p className="px-4 py-5 text-sm text-muted-foreground">No outcome areas yet.</p>
          )}
        </div>

        <div className="border border-border">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Worker Routes</h3>
            </div>
            <div className="text-xs text-muted-foreground">
              {formatUsd(routeCostUsd)} · {routeWindowDays}d
            </div>
          </div>
          {visibleRoutes.length > 0 ? (
            <div>
              {visibleRoutes.map((route) => (
                <WorkerRouteRow key={route.route} route={route} />
              ))}
            </div>
          ) : (
            <p className="px-4 py-5 text-sm text-muted-foreground">No worker route history yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function Dashboard() {
  const { selectedCompanyId, companies } = useCompany();
  const { openOnboarding } = useDialogActions();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [animatedActivityIds, setAnimatedActivityIds] = useState<Set<string>>(new Set());
  const seenActivityIdsRef = useRef<Set<string>>(new Set());
  const hydratedActivityRef = useRef(false);
  const activityAnimationTimersRef = useRef<number[]>([]);

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    setBreadcrumbs([{ label: "Dashboard" }]);
  }, [setBreadcrumbs]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard(selectedCompanyId!),
    queryFn: () => dashboardApi.summary(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: activity } = useQuery({
    queryKey: [...queryKeys.activity(selectedCompanyId!), { limit: DASHBOARD_ACTIVITY_LIMIT }],
    queryFn: () => activityApi.list(selectedCompanyId!, { limit: DASHBOARD_ACTIVITY_LIMIT }),
    enabled: !!selectedCompanyId,
  });

  const { data: issues } = useQuery({
    queryKey: queryKeys.issues.list(selectedCompanyId!),
    queryFn: () => issuesApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(selectedCompanyId!),
    queryFn: () => projectsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: companyMembers } = useQuery({
    queryKey: queryKeys.access.companyUserDirectory(selectedCompanyId!),
    queryFn: () => accessApi.listUserDirectory(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: quotaData, isLoading: quotaLoading, error: quotaError } = useQuery({
    queryKey: queryKeys.usageQuotaWindows(selectedCompanyId!),
    queryFn: () => costsApi.quotaWindows(selectedCompanyId!),
    enabled: !!selectedCompanyId,
    refetchInterval: 300_000,
    staleTime: 60_000,
  });

  const userProfileMap = useMemo(
    () => buildCompanyUserProfileMap(companyMembers?.users),
    [companyMembers?.users],
  );

  const recentIssues = issues ? getRecentIssues(issues) : [];
  const recentActivity = useMemo(() => (activity ?? []).slice(0, 10), [activity]);

  useEffect(() => {
    for (const timer of activityAnimationTimersRef.current) {
      window.clearTimeout(timer);
    }
    activityAnimationTimersRef.current = [];
    seenActivityIdsRef.current = new Set();
    hydratedActivityRef.current = false;
    setAnimatedActivityIds(new Set());
  }, [selectedCompanyId]);

  useEffect(() => {
    if (recentActivity.length === 0) return;

    const seen = seenActivityIdsRef.current;
    const currentIds = recentActivity.map((event) => event.id);

    if (!hydratedActivityRef.current) {
      for (const id of currentIds) seen.add(id);
      hydratedActivityRef.current = true;
      return;
    }

    const newIds = currentIds.filter((id) => !seen.has(id));
    if (newIds.length === 0) {
      for (const id of currentIds) seen.add(id);
      return;
    }

    setAnimatedActivityIds((prev) => {
      const next = new Set(prev);
      for (const id of newIds) next.add(id);
      return next;
    });

    for (const id of newIds) seen.add(id);

    const timer = window.setTimeout(() => {
      setAnimatedActivityIds((prev) => {
        const next = new Set(prev);
        for (const id of newIds) next.delete(id);
        return next;
      });
      activityAnimationTimersRef.current = activityAnimationTimersRef.current.filter((t) => t !== timer);
    }, 980);
    activityAnimationTimersRef.current.push(timer);
  }, [recentActivity]);

  useEffect(() => {
    return () => {
      for (const timer of activityAnimationTimersRef.current) {
        window.clearTimeout(timer);
      }
    };
  }, []);

  const agentMap = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const a of agents ?? []) map.set(a.id, a);
    return map;
  }, [agents]);

  const entityNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of issues ?? []) map.set(`issue:${i.id}`, i.identifier ?? i.id.slice(0, 8));
    for (const a of agents ?? []) map.set(`agent:${a.id}`, a.name);
    for (const p of projects ?? []) map.set(`project:${p.id}`, p.name);
    return map;
  }, [issues, agents, projects]);

  const entityTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of issues ?? []) map.set(`issue:${i.id}`, i.title);
    return map;
  }, [issues]);

  const agentName = (id: string | null) => {
    if (!id || !agents) return null;
    return agents.find((a) => a.id === id)?.name ?? null;
  };

  if (!selectedCompanyId) {
    if (companies.length === 0) {
      return (
        <EmptyState
          icon={LayoutDashboard}
          message="Welcome to Paperclip. Set up your first company and agent to get started."
          action="Get Started"
          onAction={openOnboarding}
        />
      );
    }
    return (
      <EmptyState icon={LayoutDashboard} message="Create or select a company to view the dashboard." />
    );
  }

  if (isLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  const hasNoAgents = agents !== undefined && agents.length === 0;

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-destructive">{error.message}</p>}

      {hasNoAgents && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/25 dark:bg-amber-950/60">
          <div className="flex items-center gap-2.5">
            <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              You have no agents.
            </p>
          </div>
          <button
            onClick={() => openOnboarding({ initialStep: 2, companyId: selectedCompanyId! })}
            className="text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 underline underline-offset-2 shrink-0"
          >
            Create one here
          </button>
        </div>
      )}

      <ActiveAgentsPanel companyId={selectedCompanyId!} />

      {data && (
        <>
          {data.budgets.activeIncidents > 0 ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(255,80,80,0.12),rgba(255,255,255,0.02))] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <PauseCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <div>
                  <p className="text-sm font-medium text-red-50">
                    {data.budgets.activeIncidents} active budget incident{data.budgets.activeIncidents === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-red-100/70">
                    {data.budgets.pausedAgents} agents paused · {data.budgets.pausedProjects} projects paused · {data.budgets.pendingApprovals} pending budget approvals
                  </p>
                </div>
              </div>
              <Link to="/costs" className="text-sm underline underline-offset-2 text-red-100">
                Open budgets
              </Link>
            </div>
          ) : null}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-1 sm:gap-2">
            <MetricCard
              icon={Bot}
              value={data.agents.active + data.agents.running + data.agents.paused + data.agents.error}
              label="Agents Enabled"
              to="/agents"
              description={
                <span>
                  {data.agents.running} running{", "}
                  {data.agents.paused} paused{", "}
                  {data.agents.error} errors
                </span>
              }
            />
            <MetricCard
              icon={CircleDot}
              value={data.tasks.inProgress}
              label="Tasks In Progress"
              to="/issues"
              description={
                <span>
                  {data.tasks.open} open{", "}
                  {data.tasks.blocked} blocked
                </span>
              }
            />
            <MetricCard
              icon={DollarSign}
              value={formatCents(data.costs.monthSpendCents)}
              label="Month Spend"
              to="/costs"
              description={
                <span>
                  {data.costs.monthBudgetCents > 0
                    ? `${data.costs.monthUtilizationPercent}% of ${formatCents(data.costs.monthBudgetCents)} budget`
                    : "Unlimited budget"}
                </span>
              }
            />
            <MetricCard
              icon={ShieldCheck}
              value={data.pendingApprovals + data.budgets.pendingApprovals}
              label="Pending Approvals"
              to="/approvals"
              description={
                <span>
                  {data.budgets.pendingApprovals > 0
                    ? `${data.budgets.pendingApprovals} budget overrides awaiting board review`
                    : "Awaiting board review"}
                </span>
              }
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <ChartCard title="Run Activity" subtitle="Last 14 days">
              <RunActivityChart activity={data.runActivity} />
            </ChartCard>
            <ChartCard title="Issues by Priority" subtitle="Last 14 days">
              <PriorityChart issues={issues ?? []} />
            </ChartCard>
            <ChartCard title="Issues by Status" subtitle="Last 14 days">
              <IssueStatusChart issues={issues ?? []} />
            </ChartCard>
            <ChartCard title="Success Rate" subtitle="Last 14 days">
              <SuccessRateChart activity={data.runActivity} />
            </ChartCard>
          </div>

          <QuotaHealthPanel
            quotaData={quotaData}
            quotaLoading={quotaLoading}
            quotaError={quotaError}
          />

          {data.measurement && (
            <OutcomeMeasurementPanel
              outcomeAreas={data.measurement.outcomeAreas}
              workerRoutes={data.measurement.workerRoutes}
              routeWindowDays={data.measurement.routeWindowDays}
            />
          )}

          <PluginSlotOutlet
            slotTypes={["dashboardWidget"]}
            context={{ companyId: selectedCompanyId }}
            className="grid gap-4 md:grid-cols-2"
            itemClassName="rounded-lg border bg-card p-4 shadow-sm"
          />

          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Recent Activity
                </h3>
                <div className="border border-border divide-y divide-border overflow-hidden">
                  {recentActivity.map((event) => (
                    <ActivityRow
                      key={event.id}
                      event={event}
                      agentMap={agentMap}
                      userProfileMap={userProfileMap}
                      entityNameMap={entityNameMap}
                      entityTitleMap={entityTitleMap}
                      className={animatedActivityIds.has(event.id) ? "activity-row-enter" : undefined}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Recent Tasks */}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Recent Tasks
              </h3>
              {recentIssues.length === 0 ? (
                <div className="border border-border p-4">
                  <p className="text-sm text-muted-foreground">No tasks yet.</p>
                </div>
              ) : (
                <div className="border border-border divide-y divide-border overflow-hidden">
                  {recentIssues.slice(0, 10).map((issue) => (
                    <Link
                      key={issue.id}
                      to={`/issues/${issue.identifier ?? issue.id}`}
                      className="px-4 py-3 text-sm cursor-pointer hover:bg-accent/50 transition-colors no-underline text-inherit block"
                    >
                      <div className="flex items-start gap-2 sm:items-center sm:gap-3">
                        {/* Status icon - left column on mobile */}
                        <span className="shrink-0 sm:hidden">
                          <StatusIcon status={issue.status} blockerAttention={issue.blockerAttention} />
                        </span>

                        {/* Right column on mobile: title + metadata stacked */}
                        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:contents">
                          <span className="line-clamp-2 text-sm sm:order-2 sm:flex-1 sm:min-w-0 sm:line-clamp-none sm:truncate">
                            {issue.title}
                          </span>
                          <span className="flex items-center gap-2 sm:order-1 sm:shrink-0">
                            <span className="hidden sm:inline-flex"><StatusIcon status={issue.status} blockerAttention={issue.blockerAttention} /></span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {issue.identifier ?? issue.id.slice(0, 8)}
                            </span>
                            {issue.assigneeAgentId && (() => {
                              const name = agentName(issue.assigneeAgentId);
                              return name
                                ? <span className="hidden sm:inline-flex"><Identity name={name} size="sm" /></span>
                                : null;
                            })()}
                            <span className="text-xs text-muted-foreground sm:hidden">&middot;</span>
                            <span className="text-xs text-muted-foreground shrink-0 sm:order-last">
                              {timeAgo(issue.updatedAt)}
                            </span>
                          </span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
