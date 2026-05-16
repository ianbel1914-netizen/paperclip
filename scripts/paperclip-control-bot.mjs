#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const TELEGRAM_API = "https://api.telegram.org";
const DEFAULT_COMPANY_ID = "a1a88815-804e-4282-ad9c-77107d763374";
const DEFAULT_CODEX_AGENT_ID = "4e6af8a9-cc2a-4003-bdad-48cd64fd8feb";
const DEFAULT_DB_URL = "postgres://paperclip:paperclip@localhost:54329/paperclip";
const DEFAULT_PUBLIC_URL = "https://ians-mac-mini-1.tail403c1a.ts.net";
const DEFAULT_STATE_PATH = `${process.env.HOME ?? "/Users/openclaw"}/.paperclip/instances/default/paperclip-control-bot-state.json`;
const DEFAULT_LOG_PATH = `${process.env.HOME ?? "/Users/openclaw"}/.paperclip/instances/default/logs/paperclip-control-bot.jsonl`;
const TELEGRAM_PLUGIN_KEY = "paperclip-plugin-telegram";

function env(name, fallback = "") {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

const config = {
  botToken: env("PAPERCLIP_CONTROL_TELEGRAM_BOT_TOKEN"),
  allowedUserId: env("PAPERCLIP_CONTROL_TELEGRAM_ALLOWED_USER_ID"),
  companyId: env("PAPERCLIP_COMPANY_ID", DEFAULT_COMPANY_ID),
  codexAgentId: env("PAPERCLIP_CONTROL_CODEX_AGENT_ID", DEFAULT_CODEX_AGENT_ID),
  dbUrl: env("PAPERCLIP_DATABASE_URL", DEFAULT_DB_URL),
  publicUrl: env("PAPERCLIP_PUBLIC_URL", DEFAULT_PUBLIC_URL),
  statePath: env("PAPERCLIP_CONTROL_STATE_PATH", DEFAULT_STATE_PATH),
  logPath: env("PAPERCLIP_CONTROL_LOG_PATH", DEFAULT_LOG_PATH),
};

if (!config.botToken) {
  console.error("Missing PAPERCLIP_CONTROL_TELEGRAM_BOT_TOKEN.");
  process.exit(1);
}
if (!config.allowedUserId) {
  console.error("Missing PAPERCLIP_CONTROL_TELEGRAM_ALLOWED_USER_ID.");
  process.exit(1);
}

const requireFromDbPackage = createRequire(new URL("../packages/db/package.json", import.meta.url));
const { default: postgres } = await import(requireFromDbPackage.resolve("postgres"));
const sql = postgres(config.dbUrl, { max: 1 });

async function readState() {
  try {
    return JSON.parse(await fs.readFile(config.statePath, "utf8"));
  } catch {
    return { offset: 0 };
  }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(config.statePath), { recursive: true });
  await fs.writeFile(config.statePath, JSON.stringify(state, null, 2));
}

async function audit(action, actor, details = {}) {
  await fs.mkdir(path.dirname(config.logPath), { recursive: true });
  await fs.appendFile(config.logPath, `${JSON.stringify({ at: new Date().toISOString(), action, actor, details })}\n`);
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

function isAllowed(message) {
  return String(message.from?.id ?? "") === config.allowedUserId;
}

function formatBool(value) {
  return value === true ? "on" : "off";
}

async function getTelegramPluginConfig() {
  const [row] = await sql`
    select pc.id, pc.config_json
    from plugin_config pc
    join plugins p on p.id=pc.plugin_id
    where p.plugin_key=${TELEGRAM_PLUGIN_KEY}
    limit 1
  `;
  return row ?? null;
}

async function updateTelegramPluginConfig(patch) {
  const row = await getTelegramPluginConfig();
  if (!row?.id) return null;
  const next = { ...(row.config_json ?? {}), ...patch };
  await sql`update plugin_config set config_json=${sql.json(next)}, updated_at=now() where id=${row.id}`;
  return next;
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
  await sql`update agents set runtime_config=${sql.json(nextRuntime)}, status='idle', updated_at=now() where id=${config.codexAgentId}`;
}

async function cancelCodex(reason) {
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

async function getStatus() {
  const [health, telegramConfig, codex, openRuns, openWakeups, recentIssues] = await Promise.all([
    fetch("http://127.0.0.1:3101/api/health").then((r) => r.json()).catch((err) => ({ status: "error", error: String(err) })),
    getTelegramPluginConfig(),
    sql`
      select name, status, runtime_config->'heartbeat' as heartbeat, spent_monthly_cents, budget_monthly_cents
      from agents where id=${config.codexAgentId}
    `,
    sql`
      select status, count(*)::int as count
      from heartbeat_runs
      where agent_id=${config.codexAgentId} and status in ('queued','running')
      group by status
    `,
    sql`
      select status, count(*)::int as count
      from agent_wakeup_requests
      where agent_id=${config.codexAgentId} and status in ('queued','claimed')
      group by status
    `,
    sql`
      select identifier, title, status
      from issues
      where company_id=${config.companyId} and status in ('todo','in_progress','blocked','in_review')
      order by updated_at desc
      limit 5
    `,
  ]);
  return { health, telegramConfig: telegramConfig?.config_json ?? {}, codex: codex[0], openRuns, openWakeups, recentIssues };
}

function renderStatus(status) {
  const tg = status.telegramConfig;
  const codex = status.codex;
  const runs = status.openRuns.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  const wakeups = status.openWakeups.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  return [
    `Paperclip: ${status.health.status ?? "unknown"}`,
    `Telegram CoS plugin: inbound ${formatBool(tg.enableInbound)} / commands ${formatBool(tg.enableCommands)} / notifications ${formatBool(tg.enableNotifications)}`,
    `Codex: ${codex?.status ?? "unknown"} / wakeOnDemand ${formatBool(codex?.heartbeat?.wakeOnDemand)}`,
    `Open Codex work: ${runs} runs / ${wakeups} wakeups`,
    `Codex spend: ${codex?.spent_monthly_cents ?? "?"}/${codex?.budget_monthly_cents ?? "?"} cents`,
    `Recent active: ${status.recentIssues.length ? status.recentIssues.map((i) => `${i.identifier} ${i.status}`).join(", ") : "none"}`,
  ].join("\n");
}

async function quietAll(actor) {
  await updateTelegramPluginConfig({
    enableInbound: false,
    enableCommands: false,
    enableNotifications: false,
    notifyOnIssueDone: false,
    notifyOnIssueAssigned: false,
    notifyOnAgentError: false,
    notifyOnApprovalCreated: false,
    digestMode: "off",
  });
  await cancelCodex("Cancelled by Paperclip Control Bot quiet/pause command.");
  await audit("quiet", actor);
}

async function renderInbox() {
  const rows = await sql`
    select identifier, title, status, priority
    from issues
    where company_id=${config.companyId} and status in ('todo','in_progress','blocked','in_review')
    order by updated_at desc
    limit 10
  `;
  if (!rows.length) return "No active issues.";
  return rows.map((row) => `${row.identifier} [${row.status}] ${row.title}`).join("\n");
}

async function renderCost() {
  const rows = await sql`
    select name, adapter_type, status, spent_monthly_cents, budget_monthly_cents
    from agents
    where company_id=${config.companyId}
    order by name asc
  `;
  if (!rows.length) return "No agents found.";
  return rows.map((row) => `${row.name}: ${row.spent_monthly_cents ?? 0}/${row.budget_monthly_cents ?? "?"} cents (${row.status}, ${row.adapter_type})`).join("\n");
}

function helpText() {
  return [
    "Paperclip Control Bot commands:",
    "status - health, Telegram flags, Codex gate, open work",
    "pause - quiet Telegram CoS plugin and close Codex wake gate",
    "quiet - same as pause",
    "stop - cancel open Codex runs/wakeups and close wake gate",
    "codex off - close Codex wake gate",
    "codex on - open Codex wake gate only; does not start a run",
    "inbox - recent active issues",
    "cost - agent spend and budgets",
    "help - this menu",
    "",
    "Plain messages are not routed to agents. This bot is controls only.",
  ].join("\n");
}

async function handleMessage(message) {
  if (!isAllowed(message)) return;
  const text = String(message.text ?? "").trim();
  if (!text) return;
  const lower = text.toLowerCase();
  const actor = String(message.from?.id ?? "unknown");

  if (["/start", "start", "/help", "help"].includes(lower)) {
    await send(message.chat.id, helpText(), message.message_id);
    return;
  }
  if (["status", "/status"].includes(lower)) {
    await send(message.chat.id, renderStatus(await getStatus()), message.message_id);
    return;
  }
  if (["pause", "/pause", "quiet", "/quiet"].includes(lower)) {
    await quietAll(actor);
    await send(message.chat.id, "Quiet mode enabled. Telegram CoS plugin is muted, Codex wake gate is closed, and open Codex work was cancelled.", message.message_id);
    return;
  }
  if (["stop", "/stop"].includes(lower)) {
    await cancelCodex("Cancelled by Paperclip Control Bot stop command.");
    await audit("stop", actor);
    await send(message.chat.id, "Stopped open Codex work and closed the Codex wake gate.", message.message_id);
    return;
  }
  if (["codex off", "/codex_off"].includes(lower)) {
    await setCodexWakeOnDemand(false);
    await audit("codex_off", actor);
    await send(message.chat.id, "Codex wake gate is off.", message.message_id);
    return;
  }
  if (["codex on", "/codex_on"].includes(lower)) {
    await setCodexWakeOnDemand(true);
    await audit("codex_on", actor);
    await send(message.chat.id, "Codex wake gate is on. No run was started.", message.message_id);
    return;
  }
  if (["inbox", "/inbox"].includes(lower)) {
    await send(message.chat.id, await renderInbox(), message.message_id);
    return;
  }
  if (["cost", "/cost"].includes(lower)) {
    await send(message.chat.id, await renderCost(), message.message_id);
    return;
  }

  await send(message.chat.id, "I only accept control commands. Send `help` for the menu.", message.message_id);
}

async function main() {
  let state = await readState();
  await telegram("setMyCommands", {
    commands: [
      { command: "status", description: "Show Paperclip health and gates" },
      { command: "pause", description: "Quiet Telegram and stop Codex work" },
      { command: "inbox", description: "Show recent active issues" },
      { command: "cost", description: "Show agent spend" },
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
      if (update.message) await handleMessage(update.message);
    }
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