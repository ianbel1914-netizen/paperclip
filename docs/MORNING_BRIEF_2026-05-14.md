# Morning Brief

Date: 2026-05-14

## Executive Summary

Overnight work stayed inside the approved safe lane: Codex-only repo work, Paperclip issue/document updates, tests, and handoff documentation. No Paperclip agents were unpaused, no routines were resumed, and no autonomous heartbeats were triggered.

The main outcome is that the roadmap is now an operating portfolio, not only a static plan. Paperclip can track every front, score priorities, and show progress status through linked front issues.

## Completed Work

### Priorities V2

- Extracted Priorities parsing/building logic into `ui/src/lib/priorities.ts`.
- Added parser tests in `ui/src/lib/priorities.test.ts`.
- Added mapped portfolio metadata for every roadmap front.
- Extended the Priorities page to show:
  - top-ranked project cards
  - stage
  - linked front issue
  - next milestone
  - live status from the front tracker issues under `IAN-79`
- Preserved the existing model where saves update the `IAN-79` `priorities` document and Paperclip document revisions preserve history.

### Portfolio Framework

- Created `docs/ROADMAP_PORTFOLIO_FRAMEWORK.md`.
- Added the same framework as the `portfolio-framework` document on `IAN-79`.
- Created lightweight front tracker issues:
  - `IAN-81` Paperclip Control Plane
  - `IAN-82` Chief of Staff Office
  - `IAN-83` EJV Labs Revenue Engine
  - `IAN-84` IanOS
  - `IAN-85` Real Estate Portfolio Intelligence
  - `IAN-86` Acquisition Analysis Tool
  - `IAN-87` FamilyOS
  - `IAN-88` Venture Assessment Machine
  - `IAN-89` Growth and Social Listening
  - `IAN-90` Telegram Command Channel
  - `IAN-91` Local Worker Pool
  - `IAN-92` OpenClaw Memory Integration

### Front Packs

- Created `docs/CHIEF_OF_STAFF_OPERATING_LAYER.md`.
- Created `docs/REAL_ESTATE_INTELLIGENCE_FRONT_PACK.md`.
- Created `docs/EJV_REVENUE_ENGINE_FRONT_PACK.md`.
- Attached the front packs to their Paperclip front issues:
  - `IAN-82` document key `operating-layer`
  - `IAN-83` document key `front-pack`
  - `IAN-85` document key `front-pack`

### Quota Rule

- Updated `docs/CODEX_START_HERE.md` and `docs/ROADMAP_PORTFOLIO_FRAMEWORK.md` with Ian's approved unattended stop rule:
  - stop if OpenAI/Codex weekly usage reaches 75%
  - stop if GPT-5.3-Codex-Spark weekly usage reaches 75%
  - stop if quota data is unavailable or ambiguous

## Verification

Commands run:

```bash
pnpm --filter @paperclipai/ui exec vitest run src/lib/priorities.test.ts --reporter=default
pnpm --filter @paperclipai/ui typecheck
pnpm --filter @paperclipai/ui build
```

Results:

- Priorities parser tests passed.
- UI typecheck passed.
- UI production build passed.

## Quota State

Latest checked state during the work:

- OpenAI/Codex 5-hour limit: 1%
- OpenAI/Codex weekly limit: 4%
- GPT-5.3-Codex-Spark 5-hour limit: 0%
- GPT-5.3-Codex-Spark weekly limit: 0%
- Claude weekly: 16%

This is below the approved 75% stop threshold.

## Current Portfolio Posture

| Front | Issue | Status | Near-Term Use |
| --- | --- | --- | --- |
| Paperclip Control Plane | `IAN-81` | todo | Active platform gate |
| Chief of Staff Office | `IAN-82` | todo | Design operating layer |
| EJV Labs Revenue Engine | `IAN-83` | backlog | Candidate business pilot |
| IanOS | `IAN-84` | backlog | Product concept |
| Real Estate Portfolio Intelligence | `IAN-85` | backlog | Candidate business pilot, can be promoted |
| Acquisition Analysis Tool | `IAN-86` | backlog | Candidate pilot |
| FamilyOS | `IAN-87` | backlog | Later |
| Venture Assessment Machine | `IAN-88` | backlog | Later |
| Growth and Social Listening | `IAN-89` | backlog | Paired with revenue |
| Telegram Command Channel | `IAN-90` | backlog | Platform support |
| Local Worker Pool | `IAN-91` | backlog | Platform experiment |
| OpenClaw Memory Integration | `IAN-92` | backlog | Platform dependency |

## Decisions For Ian

1. Should Real Estate Portfolio Intelligence be promoted above EJV Labs Revenue Engine?
2. For Real Estate, what is the first use case: operating KPI review, investor/lender reporting, acquisition screening, or all three?
3. Which data source should be mapped first for Real Estate?
4. For EJV, which venture should become the first revenue pilot?
5. Should Chief of Staff remain an operating pattern for now, or become a formal Paperclip agent/company after the smoke gate?

## Recommended Next Move

Use the Priorities page to decide whether `IAN-85` Real Estate Portfolio Intelligence should move ahead of `IAN-83` EJV Labs Revenue Engine. If yes, make Real Estate the first business pilot and use the front pack to start with a data inventory and first KPI pack.
