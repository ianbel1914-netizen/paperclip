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
