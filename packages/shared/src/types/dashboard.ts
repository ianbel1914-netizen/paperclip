export interface DashboardRunActivityDay {
  date: string;
  succeeded: number;
  failed: number;
  other: number;
  total: number;
}

export interface DashboardOutcomeArea {
  billingCode: string;
  open: number;
  inProgress: number;
  blocked: number;
  done: number;
  cancelled: number;
  total: number;
}

export interface DashboardWorkerRoute {
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
  successRatePercent: number;
}

export interface DashboardMeasurement {
  outcomeAreas: DashboardOutcomeArea[];
  workerRoutes: DashboardWorkerRoute[];
  routeWindowDays: number;
  routeRunLimit: number;
}

export interface DashboardSummary {
  companyId: string;
  agents: {
    active: number;
    running: number;
    paused: number;
    error: number;
  };
  tasks: {
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
  costs: {
    monthSpendCents: number;
    monthBudgetCents: number;
    monthUtilizationPercent: number;
  };
  pendingApprovals: number;
  budgets: {
    activeIncidents: number;
    pendingApprovals: number;
    pausedAgents: number;
    pausedProjects: number;
  };
  runActivity: DashboardRunActivityDay[];
  measurement?: DashboardMeasurement;
}
