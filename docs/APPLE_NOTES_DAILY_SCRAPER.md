# Apple Notes Daily Scraper

Date: 2026-05-14

Purpose: define a safe daily import path from Apple Notes into Paperclip.

## Scope

The scraper should read only one opt-in Apple Notes folder:

```text
Paperclip Inbox
```

This prevents Paperclip from importing private notes, family notes, journaling, or other personal material Ian did not intend to share.

## Initial Behavior

Version 0 should:

1. Read notes from `Paperclip Inbox`.
2. Export note title, body HTML, creation date, modification date, and source folder.
3. Save a local JSON bundle.
4. Optionally create a reviewed marker note in `Paperclip Reviewed`.
5. Not delete, move, or rename source notes.
6. Not post to Paperclip until Ian approves the final import target.

## Reviewed Marker

The first safe marker is a new note in `Paperclip Reviewed`:

```text
Paperclip Reviewed - YYYY-MM-DD
```

Body:

```text
Paperclip reviewed Apple Notes intake for YYYY-MM-DD.

Notes reviewed:
- Note title 1
- Note title 2

Import bundle:
path/to/bundle.json
```

This gives Ian a visible "done" marker inside Apple Notes without changing the original notes.

## Daily Run

Recommended run time:

```text
6:00 AM local time
```

Daily flow:

1. Run exporter.
2. Attach/export bundle into Paperclip intake.
3. CoS classifies items.
4. CoS prepares digest.
5. Create reviewed marker note only after successful export/import.

## Future Paperclip Integration

After the local export is proven, add Paperclip write-back:

- create or update an intake document on the Chief of Staff issue
- add a daily comment with summary counts
- create parking lot items when tagged
- create issues only after clear rules or Ian approval
- include source links/metadata where Apple Notes exposes them

## Safety Rules

- Default to dry-run.
- Never scrape all Apple Notes.
- Never import notes outside `Paperclip Inbox`.
- Never delete source notes.
- Never move source notes until Ian explicitly approves that behavior.
- Never import sensitive notes into agent context automatically.
- Preserve a JSON export bundle for audit and rollback.
- The first live run may require Ian to approve macOS Automation permission for Notes on the Mac Mini.

## Command

Dry run:

```bash
node scripts/apple-notes-paperclip-intake.mjs --dry-run
```

Export to file:

```bash
node scripts/apple-notes-paperclip-intake.mjs --out ~/.paperclip/apple-notes-intake/latest.json
```

Create reviewed marker after export:

```bash
node scripts/apple-notes-paperclip-intake.mjs --out ~/.paperclip/apple-notes-intake/latest.json --mark-reviewed
```
