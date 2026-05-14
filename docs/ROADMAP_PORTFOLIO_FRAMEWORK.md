# Roadmap Portfolio Framework

Date: 2026-05-14

Purpose: make every roadmap project visible as an operating front, while still forcing explicit prioritization before major execution work starts.

## Portfolio Principle

Paperclip should show progress across all fronts, but it should not start all fronts at once. The operating model is:

1. Track every front.
2. Score and rank every front.
3. Keep one active platform gate and one active business pilot unless Ian explicitly approves parallel work.
4. Use lightweight discovery, docs, and issue grooming on lower-ranked fronts so they are ready when promoted.
5. Preserve history through Paperclip issue comments and document revisions.

## Quota Stop Rule

For unattended Codex work, stop before the seven-day quota gets tight.

Hard stop:

- If OpenAI/Codex `Weekly limit` usage is greater than or equal to 50%, stop work.
- If GPT-5.3-Codex-Spark weekly usage is greater than or equal to 50%, stop work.
- If quota status is unavailable, stale, or ambiguous, stop work unless Ian explicitly approves continuing.

Soft caution:

- If the 5-hour Codex limit is greater than or equal to 35%, switch to documentation, planning, or stop.
- If Claude weekly usage is greater than or equal to 50%, do not trigger Claude-backed agents without Ian approval.

Required behavior when stopping:

- Leave a Paperclip comment explaining the quota reading.
- Commit/push any coherent completed work.
- Leave a handoff with the next safe step.
- Do not unpause agents or routines to continue the work.

## Portfolio Fronts

| Front | Outcome Area | Current Stage | Primary Outcome | Progress Signal | Next Milestone |
| --- | --- | --- | --- | --- | --- |
| Paperclip Control Plane | `platform-control-plane` | Active gate | Safe, observable, low-cost AI team infrastructure | quota green, tests pass, smoke issues complete | Codex smoke test and quota gate review |
| Chief of Staff Office | `chief-of-staff` | Design | One front door for Ian | routing rules, briefing format, decision queue | CoS operating model and first daily brief template |
| EJV Labs Revenue Engine | `ejv-revenue` | Candidate pilot | More customers and revenue for live ventures | ICPs, lead lists, outreach tests, calls booked | Pick first venture and two-week success metric |
| IanOS | `ianos` | Product concept | Dashboard for Ian's life and work | executive views defined, data sources connected | Define v0 dashboard views and source map |
| Real Estate Portfolio Intelligence | `real-estate-intelligence` | Candidate pilot | Better portfolio and operating decisions for ~5,500 apartments | reports automated, KPIs mapped, anomalies found | Create portfolio data inventory and first KPI pack |
| Acquisition Analysis Tool | `acquisition-analysis` | Candidate pilot | Faster MSA/deal screening | markets scored, deals screened, underwriting inputs mapped | Define MSA scoring model and data requirements |
| FamilyOS | `familyos` | Backlog | Lower family coordination load | tasks captured, reminders completed, records organized | Define family intake model and privacy boundaries |
| Venture Assessment Machine | `venture-assessment` | Backlog | Faster venture go/no-go and support decisions | viability memos, experiments designed, evidence tracked | Create assessment rubric and memo template |
| Growth and Social Listening | `growth-intelligence` | Backlog / paired | Discover customer and market signals | signals collected, opportunities briefed, tests launched | Define low-cost listening sources and weekly brief |
| Telegram Command Channel | `telegram-command` | Platform support | Mobile control surface for Paperclip | commands handled, audit trail preserved | Define allowed commands and escalation rules |
| Local Worker Pool | `local-worker-pool` | Platform experiment | Cheaper background work on local mini PCs | tasks benchmarked, cost reduced, quality accepted | Pick first low-risk local benchmark task |
| OpenClaw Memory Integration | `openclaw-memory` | Platform dependency | Durable memory and identity across teams | memory contract, recall quality, fewer repeated prompts | Define memory schema and sync boundary |

## Standard Front Template

Each front should have one parent issue or register section with this shape:

```text
Front:
Outcome area:
Current stage:
Priority score:
Priority override:
Owner:
Current objective:
Next milestone:
Evidence of progress:
Blocked by:
Decisions needed from Ian:
Cadence:
Stop conditions:
```

## Stage Definitions

| Stage | Meaning | Allowed Work |
| --- | --- | --- |
| Backlog | Known front, not being actively advanced | light notes, scoring, dependency capture |
| Discovery | Clarifying scope, data, users, metrics | docs, interviews, inventory, templates |
| Candidate pilot | Ready to be selected as the next major project | pilot plan, success metric, initial backlog |
| Active pilot | Current business/project focus | implementation, weekly review, evidence collection |
| Platform gate | Required infrastructure before broader autonomy | code, tests, safety checks, docs |
| Operating cadence | Repeating workflow with measurable value | routines only after explicit approval |

## Priority Override

Ian can override the score at any time. The score is a guide, not a boss.

Use `Priority override` when:

- a project becomes urgent
- a revenue or customer opportunity appears
- a data source becomes available
- a personal/family need becomes time-sensitive
- a platform risk blocks other fronts

Example: Real Estate Portfolio Intelligence may be promoted above EJV Labs Revenue Engine if a live portfolio reporting need, lender/investor request, acquisition window, or operating issue makes it the highest-value next pilot.

## Weekly Review View

Paperclip should eventually show:

| Front | Status | Score | Progress This Week | Evidence | Next Decision |
| --- | --- | ---: | --- | --- | --- |
| Paperclip Control Plane | Active gate | 32 | Safety and dashboard work | tests, commits, IAN comments | approve smoke test? |
| EJV Labs Revenue Engine | Candidate pilot | 29 | Framework ready | templates | pick venture |
| Real Estate Intelligence | Candidate pilot | 25 | Needs data map | none yet | promote above EJV? |

The goal is a short operating review, not a giant project management spreadsheet.

## History Model

Use three layers of history:

1. Paperclip document revisions for the live prioritization table.
2. Paperclip comments for decision rationale.
3. Git commits for code, docs, and templates.

If the prioritization logic changes, update the `priorities` document and add a change log entry. If a front is promoted or demoted, leave a comment explaining why.

## Near-Term Implementation

1. Keep `IAN-79` as the live prioritization register.
2. Add a `portfolio-framework` document to `IAN-79`.
3. Create one parent issue for each front only when it needs active tracking.
4. Extend the Priorities page later to show front stage, progress signal, and next milestone.
5. Add typed database tables only after the workflow stabilizes.
