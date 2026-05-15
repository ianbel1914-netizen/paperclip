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

## Conversation Mode Gap

Current Telegram behavior is capture-first, not full natural conversation.

The live runtime now provides zero-model conversational acknowledgements:

- Questions receive an "I'm here" acknowledgement and become CoS Inbox question threads.
- Brain dumps receive a captured acknowledgement and become CoS Inbox threads.
- Replies to Telegram-created task confirmations are added as Paperclip comments and acknowledged in Telegram.

This makes Telegram feel responsive without spending model tokens. It still does not generate substantive answers from a model.

The next build layer is a capped responder:

1. Direct question detection.
2. Pull only the linked issue, latest few comments, and current priority summary.
3. Generate one concise response using the cheapest approved responder route.
4. Write the response to Paperclip and Telegram.
5. Enforce nightly reply caps, quota gates, and no delegation unless explicitly approved.

Recommended first cap: 10 model-written Telegram replies per night, with no premium-model fallback and no agent/routine unpause.

## Capped Local Responder - 2026-05-14

The live Mac Mini runtime now has a capped local Ollama responder in the installed Telegram plugin runtime patch.

Current route:

- Ollama URL: `http://100.93.83.23:11434`
- Model: `qwen3:8b`
- Trigger: plain private Telegram messages classified as `Question for CoS`
- Daily cap: 10 replies by default
- Fallback: deterministic no-model response if Ollama fails, times out, or returns an empty answer
- Audit trail: responder replies are written back to the linked Paperclip issue as comments

Safety controls:

- No CEO/CTO/Coder agents are unpaused.
- No routines are unpaused.
- No Claude, Codex, or premium model fallback is used.
- The responder prompt forbids claiming agents are working or promising external actions.
- The response includes usage accounting: `Local Ollama responder X/Y today`.
- The runtime aborts the Ollama request after 20 seconds and falls back to deterministic text.

This is still a live runtime patch, not durable plugin source. The durable implementation should move this into the Telegram plugin source with tests for:

- direct question classification
- daily cap accounting
- Ollama timeout/fallback behavior
- Paperclip comment audit writes
- Telegram reply formatting
- no agent/routine wake side effects

## Question Reply UX Update - 2026-05-14

For plain Telegram messages classified as `Question for CoS`, the live runtime suppresses the verbose task-created receipt.

Expected behavior:

- Paperclip still creates the CoS Inbox issue.
- Telegram sends only the responder answer back to Ian.
- The responder answer becomes the Telegram thread anchor.
- Replies to the responder answer continue back into the same Paperclip issue as comments.

This keeps the mobile experience conversational while preserving the Paperclip audit trail.

## Codex Wake Shortcut - 2026-05-14

The live Telegram runtime supports a dedicated Codex wake lane.

User syntax:

```text
cx <request for Codex>
codex <request for Codex>
codex wake <request for Codex>
```

Expected behavior:

- Creates a Paperclip issue titled `Codex Wake: ...`.
- Sets the issue to `todo` without unpausing CEO/CTO/Coder agents or routines.
- Adds a context comment with Telegram chat/message ids, optional reply context, and Codex pickup instructions.
- Sends a concise Telegram confirmation with the issue link.
- Maps the confirmation message as the Telegram thread anchor.
- Replies to the confirmation continue back into the same Paperclip issue as comments.

Purpose:

`cx` is for Ian to route something directly to Codex as his copilot, separate from normal CoS brain dumps and `pc` Paperclip commands.

Operational rule:

Codex should search for open `Codex Wake:` issues before resuming from Telegram-driven work, read the issue comments first, then continue from the latest context. Codex should not interpret `cx` as approval to unpause agents, enable routines, or spend premium model tokens.

