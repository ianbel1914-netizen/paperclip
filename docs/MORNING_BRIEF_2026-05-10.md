# Morning Brief - 2026-05-10

## Summary

Overnight work focused on making Paperclip safer and more strategically aligned with Ian's multi-company AI operating system vision.

Agents were not unpaused. Routines were not resumed. No autonomous worker run was triggered.

## Material Progress

### Outcome Measurement

Implemented the first dashboard measurement surface:

- `measurement.outcomeAreas`: issue counts grouped by `billingCode`.
- `measurement.workerRoutes`: recent runs grouped by adapter type, requested model profile, and model.
- Worker route metrics include success/failure/cancelled counts, success rate, cost, tokens, and model-profile fallback count.
- The web dashboard now renders this as an `Outcome Measurement` section with `Outcome Areas` and `Worker Routes` panels.

Tagged the current architecture/control-plane issues `IAN-66` through `IAN-72` with billing code `platform-control-plane`.

Live dashboard now separates:

- `platform-control-plane`: 7 issues, 3 done, 4 open
- `uncategorized`: remaining legacy/current issues

The route view also exposes why model routing matters: historical Opus-path runs show materially higher cost than cheap/Sonnet routes.

### Quota Watch

Added the next control-plane surface for subscription quota visibility:

- Main dashboard now shows a `Quota Watch` section for Claude and Codex.
- It surfaces live quota windows when available.
- It surfaces provider quota errors directly when quota polling fails.
- Same-company agents can now read the read-only quota endpoint, so CEO/CoS-style operating loops can avoid resuming work blindly.
- Cross-company agent reads remain blocked.

Current live quota state:

- Claude: quota polling is failing even though Claude appears logged in via claude.ai Max. Paperclip reports the CLI usage probe ended before rendering usage.
- Codex: quota polling cannot find the local Codex executable/token on the Mac Mini.

Decision implication: do not resume heavy autonomous work until these two checks are green or we intentionally route around them.

### Architecture And Operating Model

Created:

- `docs/JOURNEY_MEMO.md`
- `docs/OUTCOME_MEASUREMENT.md`
- `docs/OVERNIGHT_WORK_PLAN.md`
- `docs/ROUTINE_REGISTRY.md`
- `docs/MODEL_ROUTING_POLICY.md`
- `docs/TELEGRAM_COMMAND_CHANNEL.md`

These docs define:

- Chief of Staff as Ian's front door.
- Separate agent companies for durable missions.
- Paperclip as system of record.
- Telegram as command channel.
- OpenClaw as persistent memory/identity.
- Codex, Claude, local models, scripts, and mini PCs as routed workers.
- Outcome measurement beyond raw cost.

### Paperclip Hardening

Implemented routine dispatch suppression:

- Automated routines now skip cleanly when the target assignee is paused, in error, pending approval, terminated, or missing.
- This prevents routines from creating execution issues and wakeups for agents that should not run.

Files changed on the Mac Mini:

- `ui/src/pages/Dashboard.tsx`
- `packages/shared/src/types/dashboard.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/index.ts`
- `server/src/services/dashboard.ts`
- `server/src/routes/costs.ts`
- `server/src/__tests__/costs-service.test.ts`
- `server/src/__tests__/dashboard-service.test.ts`
- `server/src/services/routines.ts`
- `server/src/__tests__/routines-service.test.ts`

Implemented model fallback enforcement:

- If a run requests the `cheap` model profile but Paperclip cannot apply that profile, the run now fails before adapter execution rather than silently falling back to the primary adapter config.
- This prevents automated/recovery work from accidentally launching on a premium/default model when the cheap lane is unavailable.

Files changed on the Mac Mini:

- `server/src/services/heartbeat.ts`
- `server/src/__tests__/heartbeat-model-profile.test.ts`

Related previous hardening still present:

- `server/src/services/heartbeat.ts`
- `server/src/__tests__/heartbeat-stale-queue-invalidation.test.ts`
- `server/src/middleware/auth.ts`
- `server/src/services/activity-log.ts`

## Paperclip Issues Updated

- `IAN-69` marked done: routine registry and pause/resume policy.
- `IAN-70` marked done: model routing policy.
- `IAN-66` commented with architecture memo summary.
- `IAN-68` was already marked done: Coder error diagnosis.

## Verification

Passed:

- `pnpm --filter @paperclipai/server exec vitest run src/__tests__/routines-service.test.ts --reporter=default`
- `pnpm --filter @paperclipai/server exec vitest run src/__tests__/costs-service.test.ts --reporter=default`
- `pnpm --filter @paperclipai/server exec vitest run src/__tests__/dashboard-service.test.ts --reporter=default`
- `pnpm --filter @paperclipai/server exec vitest run src/__tests__/heartbeat-model-profile.test.ts --reporter=default`
- `pnpm --filter @paperclipai/server exec vitest run src/__tests__/heartbeat-stale-queue-invalidation.test.ts --reporter=default`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`
- `pnpm --filter @paperclipai/ui build`
- `scripts/paperclip-smoke.ps1`
- Chrome visual check of `https://ians-mac-mini-1.tail403c1a.ts.net/IAN/dashboard`

Latest smoke state:

- active agents: 2
- running agents: 0
- paused agents: 2
- error agents: 0

## Open Risks

- Dollar spend still reads as zero while subscription quota can be consumed.
- Quota Watch is now visible, but both live provider quota probes are currently failing and need credential/tooling repair before autonomous work resumes.
- Model fallback enforcement is now implemented for requested `cheap` profile work. Broader route scoring and provider effectiveness measurement still need implementation.
- Existing unrelated dirty Paperclip files remain untouched.

## Recommended Next Approval

Approve a tiny CEO-only smoke heartbeat only after reviewing this brief.

Recommended smoke constraints:

- one heartbeat
- CEO only
- no delegation
- no new agents
- no routine resume
- no premium model
- must exit with a concise status comment

## Next Build Step

Design the Chief of Staff Office as the first new operating company layer, then use the visible outcome dashboard to decide which work is worth unpausing.
