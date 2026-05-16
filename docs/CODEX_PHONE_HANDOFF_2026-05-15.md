# Codex Phone Handoff - Paperclip

Date: 2026-05-15

Purpose: let Ian continue this work from Codex on phone or directly on the Mac Mini without needing the original desktop chat.

## Start Here

The active Paperclip host is the Mac Mini over Tailscale:

- Hostname: `ians-mac-mini-1.tail403c1a.ts.net`
- Mac user: `openclaw`
- Repo: `/Users/openclaw/Documents/paperclip`
- Branch: `codex/paperclip-control-plane-handoff`
- Git remote: `ian` -> `https://github.com/ianbel1914-netizen/paperclip.git`
- Local app/API: `http://127.0.0.1:3101`
- Tailnet URL: `https://ians-mac-mini-1.tail403c1a.ts.net`
- Company id: `a1a88815-804e-4282-ad9c-77107d763374`
- Codex Engineer agent id: `4e6af8a9-cc2a-4003-bdad-48cd64fd8feb`

If continuing from the Mac Mini, first run:

```bash
cd /Users/openclaw/Documents/paperclip
git status --short --branch
curl -fsS http://127.0.0.1:3101/api/health
```

## Current Safe State

As of this handoff:

- Paperclip health is OK.
- The old Chief of Staff Telegram plugin is muted:
  - `enableInbound=false`
  - `enableCommands=false`
  - `enableNotifications=false`
- Codex Engineer is idle.
- Codex wake-on-demand is off.
- No queued/running Codex runs or wakeups.
- A dirty `package.json` file exists and was intentionally not committed because it appears unrelated.

Do not unpause CEO/CTO/Coder agents or routines until the communication/control layer is stable.

## What Happened

Ian wanted Telegram to become a mobile surface for staying in contact with Paperclip/Codex while away from the PC.

We first tried to make the existing Chief of Staff Telegram bot behave like a natural Codex conversation layer. That got messy:

- Plain messages created `CoS Conversation` issues.
- The bot tried to wake Codex.
- Paperclip sometimes blocked wakes because `heartbeat.wakeOnDemand=false`.
- After opening the wake gate, Telegram became noisy with run started/finished and issue done messages.
- Smoke tests created extra synthetic issues.

Conclusion: the CoS Telegram plugin became too mixed: intake, notifications, issue bridge, local model responder, and Codex wake routing were colliding in one chat.

The current strategy is to stop natural-language Telegram for now and build a boring, deterministic control bot first.

## Important Commits

Recent commits pushed to `ian/codex/paperclip-control-plane-handoff`:

- `df5eddb5 Add command-only Paperclip control bot`
- `fccb1d35 Prevent Telegram smoke loop from waking Codex`
- `6c746ff2 Add Telegram CoS bridge smoke loop`
- `f71d1be3 Document Telegram Codex wake gate repair`
- `21de483a Add Codex oversight Telegram bot runner`
- `70d59607 Document Codex local callback smoke result`

## Files To Read

Primary:

- `docs/PAPERCLIP_CONTROL_BOT.md`
- `scripts/paperclip-control-bot.mjs`

Supporting context:

- `docs/TELEGRAM_COMMAND_CHANNEL.md`
- `docs/CODEX_OVERSIGHT_BOT.md`
- `scripts/codex-oversight-bot.mjs`
- `scripts/telegram-cos-loop-smoke.mjs`

## New Paperclip Control Bot

This is the preferred next Telegram step.

It is command-only. Plain messages do not create issues, wake agents, route to Codex, or call a model.

Commands:

- `status`
- `pause`
- `quiet`
- `stop`
- `codex on`
- `codex off`
- `inbox`
- `cost`
- `help`

It requires a separate BotFather token. Do not use the old Chief of Staff bot token.

Manual launch:

```bash
cd /Users/openclaw/Documents/paperclip
PAPERCLIP_CONTROL_TELEGRAM_BOT_TOKEN='...' \
PAPERCLIP_CONTROL_TELEGRAM_ALLOWED_USER_ID='5369089246' \
node scripts/paperclip-control-bot.mjs
```

Expected behavior:

- `status` reports Paperclip health, Telegram flags, Codex gate, open work, spend, and recent issues.
- `pause` / `quiet` mutes the old Telegram plugin, closes Codex wake gate, and cancels open Codex work.
- `stop` cancels open Codex runs/wakeups and closes the gate.
- `codex on` only opens the gate. It does not start a run.

## What To Do Next

1. Create a new BotFather bot for `Paperclip Control`.
2. Launch `scripts/paperclip-control-bot.mjs` manually with the token and Ian's Telegram user id.
3. Test only these commands first:
   - `help`
   - `status`
   - `cost`
   - `inbox`
   - `pause`
4. If stable, add a launchd service for the control bot.
5. Only after the control bot is boring and reliable, decide whether to rebuild natural-language CoS chat.

## What Not To Do

- Do not re-enable the old CoS Telegram plugin's inbound natural-language path.
- Do not restart the smoke loop unless explicitly requested.
- Do not use the old IBCos bot as the new control bot.
- Do not open Codex wake-on-demand by default.
- Do not unpause Paperclip agents or routines yet.
- Do not commit the unrelated `package.json` change without reviewing it first.

## Useful Live Checks

Paperclip health:

```bash
curl -fsS http://127.0.0.1:3101/api/health
```

Check Telegram plugin flags and Codex gate:

```bash
cd /Users/openclaw/Documents/paperclip
/opt/homebrew/opt/node@22/bin/node --input-type=module <<'NODE'
import { createRequire } from "node:module";
const require = createRequire(new URL("file:///Users/openclaw/Documents/paperclip/packages/db/package.json"));
const { default: postgres } = await import(require.resolve("postgres"));
const sql = postgres("postgres://paperclip:paperclip@localhost:54329/paperclip", { max: 1 });
const cfg = await sql`select pc.config_json from plugin_config pc join plugins p on p.id=pc.plugin_id where p.plugin_key='paperclip-plugin-telegram' limit 1`;
const agent = await sql`select name,status,runtime_config->'heartbeat' as heartbeat from agents where id='4e6af8a9-cc2a-4003-bdad-48cd64fd8feb'`;
const runs = await sql`select status,count(*)::int from heartbeat_runs where agent_id='4e6af8a9-cc2a-4003-bdad-48cd64fd8feb' and status in ('queued','running') group by status`;
const wakeups = await sql`select status,count(*)::int from agent_wakeup_requests where agent_id='4e6af8a9-cc2a-4003-bdad-48cd64fd8feb' and status in ('queued','claimed') group by status`;
console.log(JSON.stringify({
  telegram: {
    enableInbound: cfg[0]?.config_json?.enableInbound,
    enableCommands: cfg[0]?.config_json?.enableCommands,
    enableNotifications: cfg[0]?.config_json?.enableNotifications,
  },
  agent,
  runs,
  wakeups,
}, null, 2));
await sql.end();
NODE
```

Stop any accidental Telegram/Codex work:

```bash
pkill -f "telegram-cos-loop-smoke.mjs" 2>/dev/null || true
pkill -f "/opt/homebrew/bin/codex exec" 2>/dev/null || true
```

## One-Line Summary For The Next Codex

We paused the messy natural-language Telegram CoS layer and built a separate command-only Paperclip Control Bot; next step is to activate it with a new BotFather token and test only deterministic commands before any more conversational Telegram work.
