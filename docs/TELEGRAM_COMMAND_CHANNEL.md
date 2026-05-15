# Telegram Command Channel

Purpose: define Telegram as Ian's mobile command surface for Paperclip.

## Shorthand

Ian can use `pc` as shorthand for Paperclip in Telegram messages.

Examples:

- `pc add this to priorities`
- `pc put this in parking lot`
- `pc remind me tomorrow`

## Role

Telegram is not the system of record. Paperclip is.

Telegram should provide:

- urgent alerts
- morning and evening briefs
- approval buttons
- quick replies that become Paperclip comments
- blocked-work notifications
- quota/cost warnings

## Phases

1. Read-only alerts.
2. Reply-to-comment.
3. Approval buttons.
4. Chief of Staff chat.

## Security Rules

- allowlist Ian's Telegram user ID and chat ID
- never send secrets
- every inbound command writes an audit trail to Paperclip
- expensive or destructive actions create Paperclip approval records
- Telegram cannot bypass model, budget, routine, or deployment gates

## Initial Commands

- `/brief`
- `/blocked`
- `/approvals`
- `/cost`
- `/routines`
- `/issue IAN-123`

## Chief of Staff Future

Ian should eventually message the Chief of Staff in Telegram. The Chief of Staff converts messages into Paperclip issues, routes them to the right company, and returns concise status updates.

## Live Runtime Patch - 2026-05-14

The Mac Mini live instance currently has a direct runtime patch in the installed Telegram plugin at:

`~/.paperclip/plugins/node_modules/paperclip-plugin-telegram/dist/`

This patch exists so Ian can use Telegram as an away-from-computer Paperclip channel before the plugin source is rebuilt and republished.

Current live behavior:

- Plain private messages from Ian create CoS Inbox issues.
- Plain messages are labeled as `Question for CoS`, `Task candidate`, `Idea`, `Parking lot`, or `Brain dump`.
- `pc help` shows mobile shortcuts.
- `pc inbox` lists recent CoS Inbox issues.
- `pc questions` lists recent CoS question issues.
- `pc today` lists recent issues.
- `pc note <text>`, `pc idea <text>`, and `pc parking lot <text>` create labeled Paperclip tasks.
- Telegram task confirmations say: "Reply to this message to continue the thread."
- Replies to those confirmation messages are routed into the mapped Paperclip issue as comments.
- A lightweight polling bridge checks mapped Telegram-created issues and sends new Paperclip comments back to the Telegram thread.

Important implementation note: this is a runtime patch, not yet a durable plugin source change. The durable next step is to port the patch into the Telegram plugin source package, add tests around message routing, then rebuild/reinstall the plugin.

Verification commands used after the live patch:

```bash
export PATH="/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
node --check ~/.paperclip/plugins/node_modules/paperclip-plugin-telegram/dist/worker.js
node --check ~/.paperclip/plugins/node_modules/paperclip-plugin-telegram/dist/commands.js
launchctl kickstart -k gui/$(id -u)/com.paperclip.server
curl -fsS http://127.0.0.1:3101/api/health
```

Safety boundaries:

- The patch does not unpause agents or routines.
- It does not add model-generated replies.
- It does not broaden Telegram access beyond the configured allowlist.
- It keeps Paperclip as the system of record.

