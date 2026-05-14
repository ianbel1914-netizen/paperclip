#!/usr/bin/env node
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const DEFAULT_SOURCE_FOLDER = "Paperclip Inbox";
const DEFAULT_REVIEWED_FOLDER = "Paperclip Reviewed";
const OSASCRIPT_TIMEOUT_MS = 30_000;

function parseArgs(argv) {
  const options = {
    sourceFolder: DEFAULT_SOURCE_FOLDER,
    reviewedFolder: DEFAULT_REVIEWED_FOLDER,
    out: null,
    dryRun: false,
    markReviewed: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-folder") {
      options.sourceFolder = argv[++index] ?? options.sourceFolder;
    } else if (arg === "--reviewed-folder") {
      options.reviewedFolder = argv[++index] ?? options.reviewedFolder;
    } else if (arg === "--out") {
      options.out = argv[++index] ?? null;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--mark-reviewed") {
      options.markReviewed = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Apple Notes Paperclip intake

Usage:
  node scripts/apple-notes-paperclip-intake.mjs [options]

Options:
  --source-folder <name>    Apple Notes folder to read. Default: "${DEFAULT_SOURCE_FOLDER}"
  --reviewed-folder <name>  Apple Notes folder for reviewed marker. Default: "${DEFAULT_REVIEWED_FOLDER}"
  --out <path>              Write JSON bundle to this path.
  --dry-run                 Print bundle to stdout and do not mark reviewed.
  --mark-reviewed           Create a reviewed marker note after export.
  --help                    Show this help.

Safety:
  This script reads only the source folder. It does not delete, move, or rename source notes.
`);
}

function jxaString(value) {
  return JSON.stringify(String(value));
}

async function runJxa(source) {
  const dir = await mkdtemp(resolve(tmpdir(), "paperclip-notes-"));
  const scriptPath = resolve(dir, "script.js");
  try {
    await writeFile(scriptPath, source, "utf8");
    const { stdout, stderr } = await execFile("osascript", ["-l", "JavaScript", scriptPath], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: OSASCRIPT_TIMEOUT_MS,
    });
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function runAppleScript(source) {
  const dir = await mkdtemp(resolve(tmpdir(), "paperclip-notes-"));
  const scriptPath = resolve(dir, "script.applescript");
  try {
    await writeFile(scriptPath, source, "utf8");
    const { stdout, stderr } = await execFile("osascript", [scriptPath], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: OSASCRIPT_TIMEOUT_MS,
    });
    if (stderr.trim()) {
      console.error(stderr.trim());
    }
    return stdout;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function buildReadScript(sourceFolder) {
  return `
const Notes = Application("Notes");

function findFolder(folderName) {
  const accounts = Notes.accounts();
  for (const account of accounts) {
    const folders = account.folders();
    for (const folder of folders) {
      if (folder.name() === folderName) {
        return folder;
      }
    }
  }
  return null;
}

function dateValue(value) {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch (_error) {
    return String(value);
  }
}

const folderName = ${jxaString(sourceFolder)};
const folder = findFolder(folderName);
let result;
if (!folder) {
  result = {
    ok: false,
    error: "Apple Notes folder not found",
    sourceFolder: folderName,
    notes: [],
  };
} else {
  const notes = folder.notes().map((note) => ({
    title: note.name(),
    bodyHtml: note.body(),
    createdAt: dateValue(note.creationDate()),
    updatedAt: dateValue(note.modificationDate()),
    sourceFolder: folderName,
  }));
  result = {
    ok: true,
    sourceFolder: folderName,
    exportedAt: new Date().toISOString(),
    count: notes.length,
    notes,
  };
}
JSON.stringify(result);
`;
}

function appleScriptString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildMarkerScript(reviewedFolder, sourceFolder, exportedAt, titles, outPath) {
  const bodyLines = [
    `Paperclip reviewed Apple Notes intake for ${exportedAt.slice(0, 10)}.`,
    "",
    `Source folder: ${sourceFolder}`,
    `Notes reviewed: ${titles.length}`,
    "",
    ...titles.map((title) => `- ${title}`),
    "",
    outPath ? `Import bundle: ${outPath}` : "Import bundle: stdout / dry run",
  ];

  const title = `Paperclip Reviewed - ${exportedAt.slice(0, 10)}`;
  const body = bodyLines.join("<br>");

  return `
set reviewedFolderName to "${appleScriptString(reviewedFolder)}"
set markerTitle to "${appleScriptString(title)}"
set markerBody to "${appleScriptString(body)}"

tell application "Notes"
  set targetFolder to missing value
  repeat with accountItem in accounts
    repeat with folderItem in folders of accountItem
      if name of folderItem is reviewedFolderName then
        set targetFolder to folderItem
        exit repeat
      end if
    end repeat
    if targetFolder is not missing value then exit repeat
  end repeat

  if targetFolder is missing value then error "Reviewed folder not found: " & reviewedFolderName
  make new note at targetFolder with properties {name:markerTitle, body:markerBody}
end tell
`;
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("Apple Notes intake must run on macOS.");
  }

  const options = parseArgs(process.argv.slice(2));
  const raw = await runJxa(buildReadScript(options.sourceFolder));
  const bundle = JSON.parse(raw);

  if (!bundle.ok) {
    console.error(bundle.error);
    console.error(`Create an Apple Notes folder named "${options.sourceFolder}" and put opt-in notes there.`);
    process.exitCode = 2;
    return;
  }

  const output = `${JSON.stringify(bundle, null, 2)}\n`;
  if (options.out) {
    const outPath = resolve(options.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, output, "utf8");
    console.log(`Exported ${bundle.count} notes to ${outPath}`);
  } else {
    process.stdout.write(output);
  }

  if (options.markReviewed && !options.dryRun) {
    await runAppleScript(buildMarkerScript(
      options.reviewedFolder,
      options.sourceFolder,
      bundle.exportedAt,
      bundle.notes.map((note) => note.title),
      options.out ? resolve(options.out) : null,
    ));
    console.log(`Created reviewed marker in Apple Notes folder "${options.reviewedFolder}".`);
  }
}

main().catch((error) => {
  if (error && typeof error === "object" && "killed" in error && error.killed) {
    console.error("Apple Notes automation timed out. Approve the macOS Notes/Automation permission prompt on the Mac, then retry.");
    process.exitCode = 3;
    return;
  }
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
