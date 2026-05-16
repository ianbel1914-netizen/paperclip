# Paperclip Control Bot

Date: 2026-05-15

Purpose: provide a separate Telegram control panel for Paperclip after the Chief of Staff Telegram lane became too noisy for natural-language use.

## Design Rule

This bot is command-only. Plain messages do not create issues, wake agents, route to Codex, or call a model.

Use a separate BotFather bot token. Do not share the Chief of Staff bot token, because the CoS plugin may still own that Telegram update stream.

## Commands

| Command | Behavior |
| --- | --- |
| `help` | Shows the command menu |
| `status` | Shows Paperclip health, Telegram plugin flags, Codex gate, open Codex work, and recent active issues |
| `pause` / `quiet` | Disables the noisy Telegram CoS plugin, closes Codex wake-on-demand, and cancels open Codex work |
| `stop` | Cancels open Codex runs/wakeups and closes the wake gate |
| `codex off` | Closes Codex wake-on-demand without touching other flags |
| `codex on` | Opens Codex wake-on-demand but does not start a run |
| `inbox` | Lists recent active Paperclip issues |
| `cost` | Lists agent spend/budget rows |

## Activation

Create a new BotFather bot, for example `Paperclip Control`.

Run manually:

```bash
cd /Users/openclaw/Documents/paperclip
PAPERCLIP_CONTROL_TELEGRAM_BOT_TOKEN='...' \
PAPERCLIP_CONTROL_TELEGRAM_ALLOWED_USER_ID='5369089246' \
node scripts/paperclip-control-bot.mjs
```

Recommended launchd pattern: source the token from a local-only secret file and run the same command as a user service. Do not commit the token.

## Current Boundary

- This bot does not enable the CoS chat lane.
- This bot does not unpause CEO/CTO/Coder routines.
- This bot does not create Paperclip issues from plain text.
- This bot does not start Codex work unless a future explicit command is added.

## Why This Exists

The CoS Telegram plugin became a mixed surface: intake, notifications, issue bridge, local model responder, and Codex wake routing all collided in one chat. The control bot is deliberately boring: it lets Ian check status and hit the brakes from a phone while we rebuild communications cleanly.