# Model Routing Policy

Purpose: route each task to the cheapest capable worker while measuring quality.

## Default Routes

| Task Class | Preferred Worker | Backup | Approval Needed |
| --- | --- | --- | --- |
| deterministic scripts, ETL, formatting | script/local worker | local model | no |
| extraction, tagging, first-pass summaries | local/open-source model | cheap cloud model | no |
| issue triage, status, routine recovery | cheap profile | Sonnet-class model | no, unless quota pressure is high |
| coding implementation | Codex | Sonnet-class Claude | approval for long or cross-cutting work |
| architecture, product judgment | Sonnet-class Claude or Codex high-reasoning | premium model | approval for premium |
| high-stakes legal/financial/production | human plus strong model | specialist review | yes |

## Provider Strategy

Paperclip should support multiple execution lanes:

- `codex_local` for repository implementation and tests
- `claude_local` for nuanced planning and review
- local/open-source models for high-volume low-risk work
- deterministic scripts for repeatable data and reporting tasks
- human/manual route for credentials, approvals, and sensitive decisions

## Fallback Rules

- If a requested cheap profile is unavailable, do not silently fall back to a premium model for automated recovery work.
- If a worker route is unavailable, mark blocked or ask for approval rather than escalating cost by default.
- Opus-class models require explicit Ian approval or a pre-approved exception.
- Recovery and routine-generated work should prefer `cheap` profile where supported.

## Measurement

Each completed issue should record:

- worker route
- requested model profile
- applied model/profile
- cost or estimated quota pressure
- evidence type
- rework required
- accepted or rejected by reviewer

## Local Worker Pool

Ian's unused mini PCs can become low-cost workers for:

- local model inference
- embeddings/search
- batch document extraction
- social listening collection
- data normalization
- non-sensitive test runners

Do not assign high-judgment product or sensitive financial decisions to local models without human review.
