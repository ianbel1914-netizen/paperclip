# Routine Registry

Purpose: make recurring work explicit before Paperclip is allowed to run it.

## Current Live Routines

| Routine | Assignee | Status | Schedule | Risk | Decision |
| --- | --- | --- | --- | --- | --- |
| Refresh Board Decisions Queue dashboard | CEO | paused | every 4 hours | Medium: recurring coordination work can create churn | Keep paused until CoS/routine policy exists |
| Refresh cost monitor snapshot | CTO | active | daily 09:00 UTC | Low/Medium: intended read-only, but still creates an issue and may wake a paused agent | Guard automated dispatch against paused/error assignee; review before next resume |

## Required Registry Fields

Every routine must have:

- owner
- assignee
- purpose
- schedule
- expected worker route
- expected cost/quota class
- max runtime or max turn expectation
- pause condition
- resume condition
- evidence produced
- escalation owner

## Pause Conditions

Pause or skip routine dispatch when:

- assignee is paused, in error, pending approval, or terminated
- quota hard stop is active
- previous run failed
- routine created duplicate/noisy recovery issues
- routine has no current registry entry
- routine would wake more than one worker
- output is not inspected by a human or another explicit owner

## Resume Conditions

Resume only when:

- registry entry is complete
- assignee is idle or active and approved for work
- expected cost class is accepted
- stop condition is defined
- one-cycle smoke test is approved

## First Implementation Rule

Automated routines should not create execution issues or wakeups for paused/error assignees. They should record a skipped routine run with the reason so the dashboard can show "routine suppressed" rather than quietly creating queue noise.
