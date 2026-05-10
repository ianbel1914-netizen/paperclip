import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, approvals, companies, costEvents, heartbeatRuns, issues } from "@paperclipai/db";
import { notFound } from "../errors.js";
import { budgetService } from "./budgets.js";

const DASHBOARD_RUN_ACTIVITY_DAYS = 14;
const DASHBOARD_ROUTE_EFFECTIVENESS_DAYS = 30;
const DASHBOARD_ROUTE_EFFECTIVENESS_RUN_LIMIT = 500;

function formatUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getUtcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getRecentUtcDateKeys(now: Date, days: number): string[] {
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: days }, (_, index) => {
    const dayOffset = index - (days - 1);
    return formatUtcDateKey(new Date(todayUtc + dayOffset * 24 * 60 * 60 * 1000));
  });
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readRunModelProfile(resultJson: unknown) {
  const modelProfile = readRecord(readRecord(resultJson).modelProfile);
  return {
    requested: readNonEmptyString(modelProfile.requested),
    applied: readNonEmptyString(modelProfile.applied),
    fallbackReason: readNonEmptyString(modelProfile.fallbackReason),
  };
}

export function dashboardService(db: Db) {
  const budgets = budgetService(db);
  return {
    summary: async (companyId: string) => {
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .then((rows) => rows[0] ?? null);

      if (!company) throw notFound("Company not found");

      const agentRows = await db
        .select({ status: agents.status, count: sql<number>`count(*)` })
        .from(agents)
        .where(eq(agents.companyId, companyId))
        .groupBy(agents.status);

      const taskRows = await db
        .select({ status: issues.status, count: sql<number>`count(*)` })
        .from(issues)
        .where(eq(issues.companyId, companyId))
        .groupBy(issues.status);

      const pendingApprovals = await db
        .select({ count: sql<number>`count(*)` })
        .from(approvals)
        .where(and(eq(approvals.companyId, companyId), eq(approvals.status, "pending")))
        .then((rows) => Number(rows[0]?.count ?? 0));

      const agentCounts: Record<string, number> = {
        active: 0,
        running: 0,
        paused: 0,
        error: 0,
      };
      for (const row of agentRows) {
        const count = Number(row.count);
        // "idle" agents are operational — count them as active
        const bucket = row.status === "idle" ? "active" : row.status;
        agentCounts[bucket] = (agentCounts[bucket] ?? 0) + count;
      }

      const taskCounts: Record<string, number> = {
        open: 0,
        inProgress: 0,
        blocked: 0,
        done: 0,
      };
      for (const row of taskRows) {
        const count = Number(row.count);
        if (row.status === "in_progress") taskCounts.inProgress += count;
        if (row.status === "blocked") taskCounts.blocked += count;
        if (row.status === "done") taskCounts.done += count;
        if (row.status !== "done" && row.status !== "cancelled") taskCounts.open += count;
      }

      const now = new Date();
      const monthStart = getUtcMonthStart(now);
      const runActivityDays = getRecentUtcDateKeys(now, DASHBOARD_RUN_ACTIVITY_DAYS);
      const runActivityStart = new Date(`${runActivityDays[0]}T00:00:00.000Z`);
      const [{ monthSpend }] = await db
        .select({
          monthSpend: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::double precision`,
        })
        .from(costEvents)
        .where(
          and(
            eq(costEvents.companyId, companyId),
            gte(costEvents.occurredAt, monthStart),
          ),
        );

      const monthSpendCents = Number(monthSpend);
      const runActivityDayExpr = sql<string>`to_char(${heartbeatRuns.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
      const runActivityRows = await db
        .select({
          date: runActivityDayExpr,
          status: heartbeatRuns.status,
          count: sql<number>`count(*)::double precision`,
        })
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.companyId, companyId),
            gte(heartbeatRuns.createdAt, runActivityStart),
          ),
        )
        .groupBy(runActivityDayExpr, heartbeatRuns.status);

      const runActivity = new Map(
        runActivityDays.map((date) => [
          date,
          { date, succeeded: 0, failed: 0, other: 0, total: 0 },
        ]),
      );
      for (const row of runActivityRows) {
        const bucket = runActivity.get(row.date);
        if (!bucket) continue;
        const count = Number(row.count);
        if (row.status === "succeeded") bucket.succeeded += count;
        else if (row.status === "failed" || row.status === "timed_out") bucket.failed += count;
        else bucket.other += count;
        bucket.total += count;
      }

      const outcomeRows = await db
        .select({
          billingCode: issues.billingCode,
          status: issues.status,
          count: sql<number>`count(*)::double precision`,
        })
        .from(issues)
        .where(eq(issues.companyId, companyId))
        .groupBy(issues.billingCode, issues.status);

      const outcomeAreas = new Map<string, {
        billingCode: string;
        open: number;
        inProgress: number;
        blocked: number;
        done: number;
        cancelled: number;
        total: number;
      }>();
      for (const row of outcomeRows) {
        const billingCode = row.billingCode?.trim() || "uncategorized";
        const bucket = outcomeAreas.get(billingCode) ?? {
          billingCode,
          open: 0,
          inProgress: 0,
          blocked: 0,
          done: 0,
          cancelled: 0,
          total: 0,
        };
        const count = Number(row.count);
        if (row.status === "in_progress") bucket.inProgress += count;
        if (row.status === "blocked") bucket.blocked += count;
        if (row.status === "done") bucket.done += count;
        if (row.status === "cancelled") bucket.cancelled += count;
        if (row.status !== "done" && row.status !== "cancelled") bucket.open += count;
        bucket.total += count;
        outcomeAreas.set(billingCode, bucket);
      }

      const routeStart = new Date(now.getTime() - DASHBOARD_ROUTE_EFFECTIVENESS_DAYS * 24 * 60 * 60 * 1000);
      const routeRows = await db
        .select({
          status: heartbeatRuns.status,
          usageJson: heartbeatRuns.usageJson,
          resultJson: heartbeatRuns.resultJson,
          adapterType: agents.adapterType,
        })
        .from(heartbeatRuns)
        .innerJoin(agents, eq(heartbeatRuns.agentId, agents.id))
        .where(
          and(
            eq(heartbeatRuns.companyId, companyId),
            gte(heartbeatRuns.createdAt, routeStart),
          ),
        )
        .orderBy(desc(heartbeatRuns.createdAt))
        .limit(DASHBOARD_ROUTE_EFFECTIVENESS_RUN_LIMIT);

      const workerRoutes = new Map<string, {
        route: string;
        adapterType: string;
        model: string;
        requestedModelProfile: string | null;
        appliedModelProfile: string | null;
        fallbackCount: number;
        succeeded: number;
        failed: number;
        cancelled: number;
        other: number;
        total: number;
        costUsd: number;
        inputTokens: number;
        cachedInputTokens: number;
        outputTokens: number;
      }>();
      for (const row of routeRows) {
        const usage = readRecord(row.usageJson);
        const modelProfile = readRunModelProfile(row.resultJson);
        const adapterType = row.adapterType ?? "unknown";
        const model = readNonEmptyString(usage.model) ?? "unknown";
        const route = [
          adapterType,
          modelProfile.requested ? `profile:${modelProfile.requested}` : "profile:none",
          model,
        ].join("|");
        const bucket = workerRoutes.get(route) ?? {
          route,
          adapterType,
          model,
          requestedModelProfile: modelProfile.requested,
          appliedModelProfile: modelProfile.applied,
          fallbackCount: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
          other: 0,
          total: 0,
          costUsd: 0,
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
        };
        if (modelProfile.fallbackReason) bucket.fallbackCount += 1;
        if (row.status === "succeeded") bucket.succeeded += 1;
        else if (row.status === "failed" || row.status === "timed_out") bucket.failed += 1;
        else if (row.status === "cancelled") bucket.cancelled += 1;
        else bucket.other += 1;
        bucket.total += 1;
        bucket.costUsd += readNumber(usage.costUsd) ?? 0;
        bucket.inputTokens += readNumber(usage.inputTokens) ?? 0;
        bucket.cachedInputTokens += readNumber(usage.cachedInputTokens) ?? 0;
        bucket.outputTokens += readNumber(usage.outputTokens) ?? 0;
        workerRoutes.set(route, bucket);
      }

      const utilization =
        company.budgetMonthlyCents > 0
          ? (monthSpendCents / company.budgetMonthlyCents) * 100
          : 0;
      const budgetOverview = await budgets.overview(companyId);

      return {
        companyId,
        agents: {
          active: agentCounts.active,
          running: agentCounts.running,
          paused: agentCounts.paused,
          error: agentCounts.error,
        },
        tasks: taskCounts,
        costs: {
          monthSpendCents,
          monthBudgetCents: company.budgetMonthlyCents,
          monthUtilizationPercent: Number(utilization.toFixed(2)),
        },
        pendingApprovals,
        budgets: {
          activeIncidents: budgetOverview.activeIncidents.length,
          pendingApprovals: budgetOverview.pendingApprovalCount,
          pausedAgents: budgetOverview.pausedAgentCount,
          pausedProjects: budgetOverview.pausedProjectCount,
        },
        measurement: {
          outcomeAreas: Array.from(outcomeAreas.values())
            .sort((a, b) => b.total - a.total || a.billingCode.localeCompare(b.billingCode)),
          workerRoutes: Array.from(workerRoutes.values())
            .map((route) => ({
              ...route,
              successRatePercent: route.total > 0 ? Number(((route.succeeded / route.total) * 100).toFixed(2)) : 0,
              costUsd: Number(route.costUsd.toFixed(6)),
            }))
            .sort((a, b) => b.total - a.total || a.route.localeCompare(b.route)),
          routeWindowDays: DASHBOARD_ROUTE_EFFECTIVENESS_DAYS,
          routeRunLimit: DASHBOARD_ROUTE_EFFECTIVENESS_RUN_LIMIT,
        },
        runActivity: Array.from(runActivity.values()),
      };
    },
  };
}
