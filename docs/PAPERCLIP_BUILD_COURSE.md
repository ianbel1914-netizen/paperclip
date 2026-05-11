# Paperclip Build Course

Date: 2026-05-11

Purpose: chart what Paperclip has accomplished, where the build should go next, and how Ian's new local model machines should fit into the control-plane roadmap.

## Current Position

Paperclip has moved from a promising agent task manager into a real control-plane foundation.

The core systems now exist:

- multi-company model
- agents and org chart
- issues, comments, documents, approvals, and routines
- heartbeat execution through adapters
- local runtime adapters for Codex, Claude, Gemini, OpenCode, Cursor, Pi, OpenClaw, process, and HTTP-style agents
- company import/export portability
- budget and cost tracking foundations
- liveness, recovery, stale-run handling, and execution semantics
- plugin and sandbox-provider infrastructure
- dashboard outcome measurement
- Quota Watch for Claude and Codex
- routine dispatch guardrails
- model-profile fallback protection
- handoff docs so future Codex sessions can rehydrate from GitHub and Paperclip

The strategic shift is important: Paperclip is no longer just a place where agents do tasks. It is becoming Ian's operating layer for persistent AI teams and future AI-native companies.

## Near-Term Goal

The near-term goal is not more agent activity.

The near-term goal is to make the control plane:

- safe
- observable
- cheap
- portable
- recoverable
- understandable from any machine or Codex session

Only after those gates are reliable should Paperclip increase autonomous work.

## Operating Guardrails

Do not do these without Ian's explicit approval:

- unpause agents
- resume routines
- create new agents or companies
- raise budgets
- route work to premium models
- trigger autonomous overnight work
- expose secrets, tokens, or credential details

Allowed by default:

- read repo docs and source
- read live Paperclip API state when credentials/network are available
- add docs
- add focused tests
- run typechecks and targeted test suites
- improve read-only dashboards and safety checks
- prepare implementation branches for review

## What Has Been Accomplished

### Control Plane Foundation

Paperclip already models companies, goals, agents, issues, comments, approvals, routines, costs, workspaces, and execution history. The database and shared contracts are broad enough to support real operations rather than toy demos.

### Adapter And Worker Model

Paperclip can coordinate multiple worker routes through adapters. This includes local CLI workers, HTTP/process workers, OpenClaw gateway style workers, and plugin-provided adapters.

This matters because Ian's future system should not depend on one model provider or one runtime.

### Safety And Recovery

The system has explicit task ownership, atomic checkout, blocker-aware scheduling, stale queued work cancellation, liveness recovery, issue tree holds, routine dispatch suppression, and model-profile fallback blocking.

The direction is right: when Paperclip cannot safely infer the next move, it should surface the ambiguity rather than silently continue.

### Measurement

The dashboard now includes an initial outcome measurement surface:

- issue counts grouped by `billingCode`
- worker route effectiveness by adapter, requested model profile, and model
- success/failure/cancelled counts
- token and cost rollups where available
- model-profile fallback block counts

This is the first version of "what outcome did this work support, and what route did we spend to get it?"

### Portability

The branch now includes explicit handoff documents:

- `docs/CODEX_START_HERE.md`
- `docs/CLOUD_PORTABILITY_PLAN.md`
- `docs/MORNING_BRIEF_2026-05-10.md`
- `docs/JOURNEY_MEMO.md`
- `docs/OUTCOME_MEASUREMENT.md`
- `docs/MODEL_ROUTING_POLICY.md`
- `docs/ROUTINE_REGISTRY.md`
- `docs/TELEGRAM_COMMAND_CHANNEL.md`

These let a future Codex session start from GitHub, inspect the live Paperclip instance if reachable, and continue safely without depending on one desktop chat.

## Current Open Risks

### Quota Watch Is Visible But Not Green

Quota visibility is the highest-priority launch gate.

Known risks:

- Claude quota probe is failing despite Claude Max login.
- Codex quota probe is failing on the Mac Mini because the local Codex executable/token is unavailable there.
- Dollar spend can read as zero while subscription quota is still consumed.

Until this is fixed or explicitly accepted as a known risk, avoid heavy autonomous work.

### Operational State Is Still Fragile

The control plane has recovery machinery, but the operating model is still young. A small bad routine, bad prompt, bad adapter config, or hidden quota failure can still create churn.

### Outcome Metadata Is Still Lightweight

Using `billingCode` as the first outcome-area convention is useful, but Paperclip eventually needs typed fields for outcome area, expected value, cost class, worker route, evidence, and next decision.

## Build Phases

## Phase 1: Stabilize The Control Plane

Objective: make the dashboard and safety gates trustworthy enough to support controlled agent resumption.

Work:

- fix Claude quota probe
- fix Codex quota probe on the Mac Mini
- make Quota Watch green or clearly explain provider-specific failures
- ensure routine suppression reasons are visible enough for operators
- keep stale queued run cancellation and error recovery covered by tests
- preserve "cheap profile unavailable means block, not silently use primary config"
- keep handoff docs current after every meaningful operational change

Ready when:

- dashboard quota state is reliable
- no paused/error agent is silently woken by routine dispatch
- targeted server and UI typechecks pass
- targeted tests around quota, dashboard, routines, heartbeat profile handling, and stale queue handling pass
- Ian can read the dashboard and decide whether a tiny smoke heartbeat is safe

## Phase 2: Create The Chief Of Staff Layer

Objective: create one front door for Ian before adding many specialized companies.

Design the Chief of Staff Office as the first durable operating layer.

Responsibilities:

- receive Ian's requests
- turn requests into Paperclip issues or comments
- route work to the correct company or worker route
- track open loops
- surface approvals
- produce concise briefs
- protect budget and quota
- refuse work that violates operating guardrails

Initial non-goals:

- do not let Chief of Staff create companies freely
- do not let it unpause agents or routines without approval
- do not let it route premium model work without approval
- do not make Telegram the system of record

Ready when:

- there is a written Chief of Staff operating spec
- its allowed actions and approval gates are explicit
- it can produce a daily brief from Paperclip state
- it can route simple work without creating hidden autonomy

## Phase 3: Integrate Local Model Worker Pool

Ian is setting up two dedicated 32 GB machines for local models. Treat them as bounded execution capacity, not as general autonomous employees at first.

Recommended first role: local model worker pool.

Possible runtimes:

- Ollama for easiest setup and model management
- llama.cpp server for explicit GGUF control and lower-level tuning
- LocalAI only if OpenAI-compatible endpoints become important

Initial workloads:

- summarization
- tagging and classification
- document extraction
- embeddings and search support
- social-listening preprocessing
- data normalization
- low-risk first-pass research
- batch transforms where deterministic scripts are not enough

Avoid initially:

- high-judgment strategy
- sensitive financial decisions
- irreversible actions
- anything requiring secrets beyond a narrow local scope
- broad autonomous loops

Paperclip integration model:

- register each machine as an explicit execution target or worker route
- document hostnames, model inventory, RAM, disk, network, and runtime
- add health checks
- add benchmark issues with clear acceptance criteria
- record local model route performance in outcome measurement
- prefer local route for low-risk cheap tasks
- escalate to cloud only when quality or context requires it

Ready when:

- both machines have repeatable inventory docs
- a local model endpoint is reachable from the Paperclip host
- health checks are visible
- a small test model can answer a known prompt
- a benchmark issue records latency, throughput, RAM, and quality notes
- Paperclip can route one low-risk task to the local model path without touching premium models

## Phase 4: Pilot Real Outcomes

Objective: use Paperclip to create measurable value, not just more infrastructure.

Candidate pilots:

- Chief of Staff daily brief
- IanOS roadmap and execution pilot
- EJV Labs revenue-support pilot
- real estate intelligence workflow
- Telegram read-only alerts

Pilot rules:

- one pilot at a time
- explicit outcome area
- explicit cost class
- explicit worker route
- evidence required before marking work done
- Ian approval before expanding scope

Ready when:

- each pilot can answer what changed, what it cost, what evidence exists, and what Ian needs to decide next

## Phase 5: Increase Autonomy Carefully

Only after the previous phases are stable should Paperclip move toward more autonomous operation.

Possible next capabilities:

- Telegram approval buttons
- Chief of Staff chat
- typed outcome metadata
- better model route scoring
- local worker queue
- recurring daily/weekly briefs
- more specialized companies
- memory integration with OpenClaw
- controlled overnight work windows

The principle remains: autonomy should increase only when visibility, cost controls, and recovery paths are stronger than the new risk being introduced.

## Immediate Next Steps

1. Fix Claude quota probe.
2. Fix Codex quota probe on the Mac Mini.
3. Verify Quota Watch from the dashboard and API.
4. Draft Chief of Staff operating spec.
5. Inventory the two 32 GB local model machines.
6. Choose the first local runtime, likely Ollama unless inventory suggests llama.cpp is better.
7. Create one benchmark issue per local machine.
8. Run a tiny CEO-only smoke heartbeat only after Ian explicitly approves it.

## Local Model Machine Inventory Template

Use this for each new machine:

```text
machine name:
hostname or LAN IP:
SSH username:
OS and version:
CPU:
RAM:
storage:
GPU/iGPU/NPU:
Docker available:
Python available:
systemd available:
preferred runtime:
models installed:
endpoint URL:
firewall/LAN exposure:
benchmark notes:
```

## Definition Of "Ready For More Autonomy"

Paperclip is ready for more autonomy when:

- quota probes are green or explicitly waived
- no routine can wake an unsafe assignee
- local and cloud worker routes are visible
- model fallback behavior is conservative
- dashboard surfaces outcome, cost, quota, blocked work, and approvals
- handoff docs are current
- recovery paths produce visible issues/comments rather than hidden churn
- Ian can approve or reject the next step from a concise brief

The build should keep moving toward that line.
