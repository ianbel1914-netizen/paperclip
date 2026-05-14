# Codex Start Here

Purpose: let any Codex session, local or cloud, pick up the Paperclip work without relying on one desktop chat.

## Canonical Sources

Use these sources in this order:

1. GitHub repo: `https://github.com/ianbel1914-netizen/paperclip.git`
2. Branch: `codex/paperclip-control-plane-handoff`
3. Paperclip live instance: `https://ians-mac-mini-1.tail403c1a.ts.net`
4. Paperclip company: `Ian Projects`
5. Paperclip company id: `a1a88815-804e-4282-ad9c-77107d763374`
6. Paperclip issue record: start with `IAN-66`

GitHub is the portable source of truth for code and docs. Paperclip is the operating record for decisions, issues, agent state, and live system context.

## Current Goal

Build Paperclip into Ian's AI operating system for managing persistent software teams and future agent companies across:

- IanOS
- FamilyOS
- real estate portfolio intelligence
- acquisition analysis
- EJV Labs venture studio revenue support
- growth and social-listening intelligence
- shared engineering platform work

The near-term goal is not to maximize agent activity. The near-term goal is to make the control plane safe, observable, cheap, and portable.

## Current Guardrails

Do not do these without explicit Ian approval:

- unpause agents
- resume routines
- create new agents or companies
- trigger autonomous overnight work
- raise budgets
- route work to premium models
- expose secrets or tokens

Allowed by default:

- read Paperclip API state
- read and edit repo files
- add docs
- add tests
- run typechecks/tests
- add Paperclip comments with durable status
- improve read-only dashboards and safety checks

## Live System Context

Paperclip runs on Ian's Mac Mini:

- Tailscale host: `ian-mac-mini-1`
- URL: `https://ians-mac-mini-1.tail403c1a.ts.net`
- Mac repo path: `/Users/openclaw/Documents/paperclip`
- API base: `https://ians-mac-mini-1.tail403c1a.ts.net/api`

Current known agents:

- CEO: `2e6a207a-c00e-4bd5-899e-ef68e64ed5a4`
- CTO: `216de83a-e21f-45e1-8d96-eba4821006a2`
- Coder: `9dd03466-3bdf-422b-aa1a-9eae24a3dec9`
- Coder 2: `7aa4547f-ab6b-4bcc-8046-14ce402a77df`
- Codex Engineer: `4e6af8a9-cc2a-4003-bdad-48cd64fd8feb`

Latest known smoke state:

- active agents: 3
- running agents: 0
- paused agents: 2
- error agents: 0

Codex Engineer status:

- adapter: `codex_local`
- heartbeat disabled
- wake-on-demand disabled
- max concurrency: 1
- monthly budget: 1000 cents
- model: `gpt-5.3-codex-spark`
- posture: present but dormant until Ian explicitly approves a smoke run

## What Has Been Built

See:

- `docs/PROJECT_ROADMAP.md`
- `docs/PAPERCLIP_SYSTEM_MEMO.md`
- `docs/MORNING_BRIEF_2026-05-10.md`
- `docs/JOURNEY_MEMO.md`
- `docs/OUTCOME_MEASUREMENT.md`
- `docs/MODEL_ROUTING_POLICY.md`
- `docs/ROUTINE_REGISTRY.md`
- `docs/TELEGRAM_COMMAND_CHANNEL.md`

Implemented control-plane changes include:

- dashboard outcome measurement by billing code
- worker route effectiveness by adapter/profile/model
- dashboard Quota Watch for Claude and Codex
- read-only quota endpoint access for same-company agents
- routine dispatch guard when assignee is paused/error/pending approval/terminated/missing
- model fallback enforcement for requested cheap profile work
- stale queued run cancellation no longer leaves agents stuck in error
- stale run id handling for activity logging

## Known Open Risks

Quota visibility is now surfaced. Latest known live state:

- Claude quota probe: green via `claude-cli`.
- Codex quota probe: green via `codex-rpc`.
- Codex login on the Mac Mini: verified with `codex login status`.

Do not resume heavy autonomous work until quota checks are rechecked as green in the current session or Ian explicitly accepts a route around them.

There are also unrelated dirty files on the Mac Mini that should not be reverted without inspection:

- `server/src/__tests__/heartbeat-active-run-output-watchdog.test.ts`
- `server/src/services/recovery/service.ts`
- `paperclip.log`
- `scripts/launchd-start.sh`

## First Commands For A New Codex Session

Clone or fetch the work:

```bash
git clone https://github.com/ianbel1914-netizen/paperclip.git
cd paperclip
git switch codex/paperclip-control-plane-handoff
```

If working on the Mac Mini:

```bash
cd /Users/openclaw/Documents/paperclip
git switch codex/paperclip-control-plane-handoff
git status --short --branch
```

Run verification:

```bash
pnpm --filter @paperclipai/server typecheck
pnpm --filter @paperclipai/ui typecheck
pnpm --filter @paperclipai/server exec vitest run src/__tests__/costs-service.test.ts src/__tests__/dashboard-service.test.ts src/__tests__/heartbeat-model-profile.test.ts src/__tests__/heartbeat-stale-queue-invalidation.test.ts src/__tests__/routines-service.test.ts --reporter=default
```

From Ian's Windows Codex workspace, smoke the live instance:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\paperclip-smoke.ps1
```

## Paperclip API Check

Use the existing local environment key. Do not print the key.

```powershell
$base='https://ians-mac-mini-1.tail403c1a.ts.net'
$company='a1a88815-804e-4282-ad9c-77107d763374'
$key=[Environment]::GetEnvironmentVariable('PAPERCLIP_API_KEY','User'); if (-not $key) { $key=$env:PAPERCLIP_API_KEY }
$headers=@{Authorization="Bearer $key"}
Invoke-RestMethod -Headers $headers "$base/api/companies/$company/dashboard" | ConvertTo-Json -Depth 8
Invoke-RestMethod -Headers $headers "$base/api/companies/$company/costs/quota-windows" | ConvertTo-Json -Depth 8
```

## Next Recommended Work

1. Recheck Quota Watch for Claude and Codex.
2. Run the `IAN-78` Codex Engineer no-code smoke issue only if Ian explicitly approves it.
3. Create a Chief of Staff operating layer design before adding more agent companies.
4. Start the EJV Labs Revenue Engine as the first business pilot after the control gates pass.
5. Add typed outcome fields after the billing-code convention stabilizes.
6. Design the OpenClaw memory integration contract.

## Operating Principle

Any future Codex session should be able to start from this file, read the linked docs, inspect `IAN-66`, run the smoke check, and make safe progress without depending on the original local chat history.
