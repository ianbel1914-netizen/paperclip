# Codex Oversight Bot

Date: 2026-05-15

Purpose: provide a separate Telegram operator channel for Codex/Paperclip control-plane work without mixing technical execution into the Chief of Staff intake bot.

## Why Separate

The Chief of Staff bot should feel natural and low-friction. It captures thoughts, notes, priorities, and lightweight status.

The Codex Oversight bot is different. It is the command channel for work like:

- inspect Paperclip health
- check Codex agent status
- run a bounded Codex task
- stop Codex work
- create issue-backed audit trails
- report results back to Telegram

Keeping this as a second bot prevents accidental Codex spend from ordinary brain dumps.

## Current Safety Posture

The Codex Engineer callback path has been proven with this configuration:

- `PAPERCLIP_API_URL=https://ians-mac-mini-1.tail403c1a.ts.net`
- `dangerouslyBypassApprovalsAndSandbox=true`
- `heartbeat.enabled=false`
- `heartbeat.wakeOnDemand=false` by default
- `heartbeat.maxConcurrentRuns=1`

The bypass is necessary for the local Codex process to reach Paperclip from the Mac Mini. That also means this lane must stay command-gated.

## Bot Commands

The first version is intentionally small:

| Command | Behavior |
| --- | --- |
| `help` | Show commands |
| `status` | Show Codex Engineer status, wake gate, open runs, and spend |
| `run <task>` | Create a Paperclip issue, briefly enable Codex wake-on-demand, queue one Codex run |
| `stop` | Cancel queued/running Codex oversight work and close wake-on-demand |

Plain messages do not run Codex. This protects cost and avoids accidental execution.

## Activation

1. Create a second Telegram bot in BotFather, for example `Codex Paperclip Oversight`.
2. Save the token on the Mac Mini as an environment variable.
3. Set Ian's Telegram user id as the allowlist.
4. Run the bot with the repo script:

```bash
cd /Users/openclaw/Documents/paperclip
CODEX_OVERSIGHT_TELEGRAM_BOT_TOKEN='...' \
CODEX_OVERSIGHT_TELEGRAM_ALLOWED_USER_ID='5369089246' \
node scripts/codex-oversight-bot.mjs
```

For launchd, wrap the same command in a small service script that exports the token from a local-only secret file.

## Cost Guard

Defaults:

- daily run cap: `3`
- one Codex run at a time
- Telegram user allowlist is required at startup
- wake-on-demand is automatically closed when no run/wakeup is open
- `stop` cancels open Codex oversight work

Optional override:

```bash
CODEX_OVERSIGHT_DAILY_RUN_CAP=5
```

## Next Improvements

- Store the bot token in Paperclip secrets instead of shell env.
- Add a UI switch for Codex Oversight wake gate.
- Add a pre-run quota check before creating the wakeup.
- Summarize token usage after each run.
- Add a launchd installer once the BotFather token is available.
