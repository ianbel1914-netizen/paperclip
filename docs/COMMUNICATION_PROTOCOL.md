# Communication Protocol

Date: 2026-05-14

Purpose: make it effortless for Ian to capture thoughts anywhere, then let Paperclip organize them into priorities, issues, parking lot items, reminders, and decisions.

## Principle

Ian should not have to think about the system while capturing thoughts.

The capture layer should be fast and forgiving. The organization layer should happen afterward.

Operating model:

1. Ian captures in the easiest available place.
2. Paperclip imports the capture stream.
3. The Chief of Staff layer classifies and routes.
4. Ian reviews a short digest and approves anything consequential.
5. Paperclip updates priorities, issues, docs, reminders, or parking lot.

## Capture Channels

| Channel | Use For | Paperclip Behavior |
| --- | --- | --- |
| Telegram | Anything Ian wants Paperclip to see immediately or soon | Treat as live inbox and command channel |
| Apple Notes | Fast personal capture, stream-of-consciousness notes, longer thoughts | Daily opt-in scrape from a dedicated folder |
| Paperclip UI | Durable decisions, issue comments, priorities, approvals | System of record |

## Telegram SOP

Telegram is the main Paperclip inbox. Use it for quick thoughts, voice notes, links, screenshots, commands, and follow-ups.

No strict format is required. Untagged messages go to the general inbox.

Optional tags:

| Tag | Meaning |
| --- | --- |
| `#inbox` | General thought to classify later |
| `#priority` | Possible priority change |
| `#parkinglot` | Keep this idea, do not act yet |
| `#decision` | Durable decision or rationale |
| `#reminder` | Time-sensitive follow-up |
| `#family` | FamilyOS or household |
| `#venture` | EJV Labs or venture studio |
| `#realestate` | Portfolio, acquisition, market, or asset work |
| `#fun` | Joy, sports, travel, creative ideas |

Examples:

```text
#parkinglot ClickUp integration might matter later, but do not let it distract us now.
```

```text
#priority Real Estate Intelligence may need to move above EJV this week because we have a live reporting need.
```

```text
#fun Sports dashboard idea: track games, trips, family/friend rituals, and favorite memories.
```

## Telegram Processing Rules

The CoS layer should classify each Telegram item as one of:

- Paperclip issue
- issue comment
- priority score change
- parking lot item
- reminder
- question for Ian
- private/no-action note
- daily brief input

Approval is required before:

- sending external communications
- creating or unpausing agents
- changing budgets or model routes
- scraping external sites at volume
- importing sensitive systems
- writing into ClickUp, Notion, email, CRM, or other team tools

## Apple Notes SOP

Apple Notes remains Ian's default quick-thought scratchpad.

To keep this safe, Paperclip should scrape only a dedicated folder:

```text
Paperclip Inbox
```

Recommended folders:

```text
Paperclip Inbox
Paperclip Reviewed
```

Rules:

- Only notes in `Paperclip Inbox` are eligible for import.
- Notes outside that folder are private by default.
- The scraper runs daily.
- The scraper creates a daily import bundle for Paperclip.
- After successful review/import, Paperclip marks that day's Apple Notes intake as reviewed.
- The first implementation should start read-only/dry-run until Ian confirms the behavior.

## Apple Notes Reviewed Marker

Preferred first reviewed-marker behavior:

1. Export all eligible notes modified since the last successful scrape.
2. Import or attach the bundle to Paperclip intake.
3. Create a marker note in `Paperclip Reviewed` named:

```text
Paperclip Reviewed - YYYY-MM-DD
```

The marker note should include:

- scrape timestamp
- number of notes reviewed
- note titles reviewed
- Paperclip intake issue/document link when available

Do not edit or delete original notes in the first version. Moving or renaming original notes can come later if Ian wants a stronger visual workflow.

## Daily CoS Digest

The CoS layer should turn Telegram and Apple Notes captures into a concise digest:

```text
Captured today:

Decisions:

Potential priority changes:

New tasks/issues:

Parking lot:

Questions for Ian:

Recommended next move:
```

## Future Enhancements

- Voice-note transcription from Telegram.
- One-click promote to issue, priority, or parking lot.
- Apple Notes import status inside Priorities.
- Daily digest comment on the CoS front issue.
- Optional later write-back to Apple Notes when Ian explicitly wants stronger visual marking.
