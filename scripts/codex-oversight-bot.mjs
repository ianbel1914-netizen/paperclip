#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const TELEGRAM_API = "https://api.telegram.org";
const DEFAULT_COMPANY_ID = "a1a88815-804e-4282-ad9c-77107d763374";
const DEFAULT_CODEX_AGENT_ID = "4e6af8a9-cc2a-4003-bdad-48cd64fd8feb";
const DEFAULT_DB_URL = "postgres://paperclip:paperclip@localhost:54329/paperclip";
const DEFAULT_PUBLIC_URL = "https://ians-mac-mini-1.tail403c1a.ts.net";
const DEFAULT_STATE_PATH = "/Users/openclaw/.paperclip/instances/default/codex-oversight-bot-state.json";

function env(name, fallback = "") {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

const config = {
  botToken: env("CODEX_OVERSIGHT_TELEGRAM_BOT_TOKEN", env("TELEGRAM_BOT_TOKEN")),
  allowedUserId: env("CODEX_OVERSIGHT_TELEGRAM_ALLOWED_USER_ID", env("TELEGRAM_ALLOWED_USER_ID")),
  companyId: env("PAPERCLIP_COMPANY_ID", DEFAULT_COMPANY_ID),
  codexAgentId: env("CODEX_OVERSIGHT_AGENT_ID", DEFAULT_CODEX_AGENT_ID),
  dbUrl: env("PAPERCLIP_DATABASE_URL", DEFAULT_DB_URL),
  publicUrl: env("PAPERCLIP_PUBLIC_URL", DEFAULT_PUBLIC_URL),
  statePath: env("CODEX_OVERSIGHT_STATE_PATH", DEFAULT_STATE_PATH),
  dailyRunCap: Number(env("CODEX_OVERSIGHT_DAILY_RUN_CAP", "3")),
};

if (!config.botToken) {
  console.error("Missing CODEX_OVERSIGHT_TELEGRAM_BOT_TOKEN.");
  process.exit(1);
}
if (!config.allowedUserId) {
  console.error("Missing CODEX_OVERSIGHT_TELEGRAM_ALLOWED_USER_ID.");
  process.exit(1);
}

const requireFromDbPackage = createRequire(new URL("../packages/db/package.json", import.meta.url));
const { default: postgres } = await import(requireFromDbPackage.resolve("postgres"));
const sql = postgres(config.dbUrl, { max: 1 });

async function readState() {
  try {
    return JSON.parse(await fs.readFile(config.statePath, "utf8"));
  } catch {
    return { offset: 0, watchedIssues: {}, runsByDay: {} };
  }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(config.statePath), { recursive: true });
  await fs.writeFile(config.statePath, JSON.stringify(state, null, 2));
}

async function telegram(method, body) {
  const res = await fetch(`${TELEGRAM_API}/bot${config.botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(`Telegram ${method} failed: ${JSON.stringify(json)}`);
  return json.result;
}

async function send(chatId, text, replyToMessageId = null) {
  return telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyToMessageId ? { reply_to_message_id: replyToMessageId } : {}),
    disable_web_page_preview: true,
  });
}

function assertAllowed(message) {
  return String(message.from?.id ?? "") === config.allowedUserId;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function setCodexWakeOnDemand(enabled) {
  const [agent] = await sql`select runtime_config from agents where id=${config.codexAgentId}`;
  const runtime = agent?.runtime_config ?? {};
  const heartbeat = runtime.heartbeat ?? {};
  const nextRuntime = {
    ...runtime,
    heartbeat: {
      ...heartbeat,
      enabled: false,
      wakeOnDemand: enabled,
      maxConcurrentRuns: 1,
    },
  };
  await sql`
    update agents
    set runtime_config=${sql.json(nextRuntime)}, status='idle', updated_at=now()
    where id=${config.codexAgentId}
  `;
}

async function cancelOpenCodexWork(reason) {
  await sql`
    update heartbeat_runs
    set status='cancelled', finished_at=coalesce(finished_at, now()), error=coalesce(error, ${reason}), updated_at=now()
    where agent_id=${config.codexAgentId} and status in ('queued','running')
  `;
  await sql`
    update agent_wakeup_requests
    set status='cancelled', finished_at=coalesce(finished_at, now()), error=coalesce(error, ${reason}), updated_at=now()
    where agent_id=${config.codexAgentId} and status in ('queued','claimed')
  `;
  await setCodexWakeOnDemand(false);
}

async function getCodexStatus() {
  const [agent] = await sql`
    select name, status, runtime_config->'heartbeat' as heartbeat, spent_monthly_cents, budget_monthly_cents
    from agents
    where id=${config.codexAgentId}
  `;
  const openRuns = await sql`
    select id, status, started_at
    from heartbeat_runs
    where agent_id=${config.codexAgentId} and status in ('queued','running')
    order by created_at desc
    limit 5
  `;
  const openWakeups = await sql`
    select id, status, requested_at
    from agent_wakeup_requests
    where agent_id=${config.codexAgentId} and status in ('queued','claimed')
    order by created_at desc
    limit 5
  `;
  return { agent, openRuns, openWakeups };
}

async function createOversightIssue(requestText) {
  const [numberRow] = await sql`select coalesce(max(issue_number), 0) + 1 as next_number from issues where company_id=${config.companyId}`;
  const issueNumber = Number(numberRow.next_number);
  const identifier = `IAN-${issueNumber}`;
  const title = `Codex Oversight: ${requestText.replace(/\s+/g, " ").slice(0, 90)}`;
  const description = [
    "Codex Oversight Bot request",
    "",
    "Intent: Ian is asking the Codex operator lane to inspect, fix, or execute Paperclip control-plane work.",
    "Boundaries: do not unpause CEO/CTO/Coder agents, enable routines, or spend premium model tokens unless Ian explicitly asks.",
    "Keep the response concise and post durable evidence in this issue.",
    "",
    "Request:",
    requestText,
  ].join("\n");
  const [issue] = await sql`
    insert into issues (
      company_id, title, description, status, priority, assignee_agent_id,
      created_by_user_id, issue_number, identifier, origin_kind, origin_id, origin_fingerprint,
      created_at, updated_at
    )
    values (
      ${config.companyId}, ${title}, ${description}, 'todo', 'medium', ${config.codexAgentId},
      'telegram-codex-oversight', ${issueNumber}, ${identifier}, 'telegram:codex-oversight',
      ${`codex-oversight-${Date.now()}`}, 'codex-oversight', now(), now()
    )
    returning id, identifier, title
  `;
  const payload = {
    reason: "telegram_codex_oversight",
    issue: { id: issue.id, identifier: issue.identifier, title: issue.title, status: "todo", priority: "medium" },
    checkedOutByHarness: false,
    comments: [],
    requestedCount: 0,
    includedCount: 0,
    missingCount: 0,
    truncated: false,
    fallbackFetchNeeded: false,
  };
  const [wakeup] = await sql`
    insert into agent_wakeup_requests (
      company_id, agent_id, source, trigger_detail, reason, payload, status,
      requested_by_actor_type, requested_by_actor_id, idempotency_key, requested_at, created_at, updated_at
    )
    values (
      ${config.companyId}, ${config.codexAgentId}, 'on_demand', 'manual', 'telegram_codex_oversight',
      ${sql.json(payload)}, 'queued', 'board', 'telegram-codex-oversight',
      ${`telegram-codex-oversight-${Date.now()}`}, now(), now(), now()
    )
    returning id
  `;
  return { issue, wakeup };
}

async function runOversightRequest(state, message, requestText) {
  const key = todayKey();
  state.runsByDay[key] = Number(state.runsByDay[key] ?? 0);
  if (state.runsByDay[key] >= config.dailyRunCap) {
    await send(message.chat.id, `Daily Codex Oversight cap reached (${config.dailyRunCap}). Use stop/status, or raise the cap deliberately.`, message.message_id);
    return;
  }
  const status = await getCodexStatus();
  if (status.openRuns.length || status.openWakeups.length) {
    await send(message.chat.id, "Codex already has an open oversight run. Use status or stop before queuing another.", message.message_id);
    return;
  }
  await setCodexWakeOnDemand(true);
  const { issue } = await createOversightIssue(requestText);
  state.runsByDay[key] += 1;
  state.watchedIssues[issue.id] = {
    chatId: String(message.chat.id),
    identifier: issue.identifier,
    lastCommentId: null,
  };
  await send(message.chat.id, `Queued ${issue.identifier}: ${issue.title}\n${config.publicUrl}/IAN/issues/${issue.identifier}`, message.message_id);
}

async function handleMessage(state, message) {
  if (!assertAllowed(message)) return;
  const text = String(message.text ?? "").trim();
  if (!text) return;
  const lower = text.toLowerCase();
  if (lower === "/start" || lower === "help" || lower === "/help") {
    await send(message.chat.id, "Codex Oversight commands:\nstatus\nrun <task>\nstop\n\nThis bot is command-gated to control cost.", message.message_id);
    return;
  }
  if (lower === "status" || lower === "/status") {
    const status = await getCodexStatus();
    await send(
      message.chat.id,
      `Codex Engineer: ${status.agent?.status ?? "unknown"}\nwakeOnDemand: ${status.agent?.heartbeat?.wakeOnDemand === true}\nopen runs: ${status.openRuns.length}\nopen wakeups: ${status.openWakeups.length}\nmonthly spend: ${status.agent?.spent_monthly_cents ?? "?"}/${status.agent?.budget_monthly_cents ?? "?"} cents`,
      message.message_id,
    );
    return;
  }
  if (lower === "stop" || lower === "/stop") {
    await cancelOpenCodexWork("Cancelled by Codex Oversight Bot stop command.");
    await send(message.chat.id, "Stopped Codex oversight work and closed wake-on-demand.", message.message_id);
    return;
  }
  const runMatch = text.match(/^(?:run|codex|do)\s+([\s\S]+)$/i);
  if (runMatch) {
    await runOversightRequest(state, message, runMatch[1].trim());
    return;
  }
  await send(message.chat.id, "Use `run <task>` for Codex work, or `status` / `stop`.", message.message_id);
}

async function forwardIssueComments(state) {
  for (const [issueId, watch] of Object.entries(state.watchedIssues ?? {})) {
    const comments = await sql`
      select id, body, author_type, created_at
      from issue_comments
      where issue_id=${issueId}
      order by created_at asc
    `;
    const lastIndex = watch.lastCommentId
      ? comments.findIndex((comment) => comment.id === watch.lastCommentId)
      : -1;
    const unsent = lastIndex >= 0 ? comments.slice(lastIndex + 1) : comments;
    for (const comment of unsent.filter((c) => c.author_type === "agent")) {
      await send(watch.chatId, `${watch.identifier}\n${comment.body.slice(0, 3500)}`);
      watch.lastCommentId = comment.id;
    }
    const [issue] = await sql`select status from issues where id=${issueId}`;
    if (issue && ["done", "blocked", "cancelled"].includes(issue.status)) {
      delete state.watchedIssues[issueId];
    }
  }
  const status = await getCodexStatus();
  if (!status.openRuns.length && !status.openWakeups.length) {
    await setCodexWakeOnDemand(false);
  }
}

async function main() {
  let state = await readState();
  await telegram("setMyCommands", {
    commands: [
      { command: "status", description: "Show Codex oversight status" },
      { command: "stop", description: "Stop Codex oversight work" },
      { command: "help", description: "Show commands" },
    ],
  }).catch(() => undefined);
  while (true) {
    const updates = await telegram("getUpdates", {
      offset: Number(state.offset ?? 0) + 1,
      timeout: 20,
      allowed_updates: ["message"],
    });
    for (const update of updates) {
      state.offset = Math.max(Number(state.offset ?? 0), update.update_id);
      if (update.message) await handleMessage(state, update.message);
    }
    await forwardIssueComments(state);
    await writeState(state);
  }
}

process.on("SIGINT", async () => {
  await sql.end({ timeout: 1 }).catch(() => undefined);
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await sql.end({ timeout: 1 }).catch(() => undefined);
  process.exit(0);
});

main().catch(async (err) => {
  console.error(err);
  await sql.end({ timeout: 1 }).catch(() => undefined);
  process.exit(1);
});
