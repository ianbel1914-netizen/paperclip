#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { createDecipheriv, randomUUID } from "node:crypto";
import { createRequire } from "node:module";

const requireFromDbPackage = createRequire(new URL("../packages/db/package.json", import.meta.url));
const { default: postgres } = await import(requireFromDbPackage.resolve("postgres"));

const COMPANY_ID = process.env.PAPERCLIP_COMPANY_ID ?? "a1a88815-804e-4282-ad9c-77107d763374";
const CODEX_AGENT_ID = process.env.CODEX_ENGINEER_AGENT_ID ?? "4e6af8a9-cc2a-4003-bdad-48cd64fd8feb";
const DB_URL = process.env.PAPERCLIP_DATABASE_URL ?? "postgres://paperclip:paperclip@localhost:54329/paperclip";
const PUBLIC_URL = process.env.PAPERCLIP_PUBLIC_URL ?? "https://ians-mac-mini-1.tail403c1a.ts.net";
const MASTER_KEY_FILE = process.env.PAPERCLIP_SECRETS_MASTER_KEY_FILE ?? "/Users/openclaw/.paperclip/instances/default/secrets/master.key";
const LOG_PATH = process.env.TELEGRAM_COS_SMOKE_LOG ?? "/Users/openclaw/.paperclip/instances/default/logs/telegram-cos-smoke.jsonl";
const PLUGIN_KEY = "paperclip-plugin-telegram";
const TELEGRAM_API = "https://api.telegram.org";

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    const key = arg.slice(2);
    const next = process.argv[i + 1];
    if (!next || next.startsWith("--")) args.set(key, "true");
    else {
      args.set(key, next);
      i += 1;
    }
  }
}

const loop = args.get("loop") === "true";
const iterations = Number(args.get("iterations") ?? (loop ? "7" : "1"));
const intervalSec = Number(args.get("interval-sec") ?? "3600");
const waitSec = Number(args.get("wait-sec") ?? "75");
const label = args.get("label") ?? "manual";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeMasterKey(raw) {
  const trimmed = raw.trim();
  if (/^[A-Fa-f0-9]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  const decoded = Buffer.from(trimmed, "base64");
  if (decoded.length === 32) return decoded;
  if (Buffer.byteLength(trimmed, "utf8") === 32) return Buffer.from(trimmed, "utf8");
  throw new Error("Invalid secrets master key");
}

function decryptSecret(masterKey, material) {
  const decipher = createDecipheriv("aes-256-gcm", masterKey, Buffer.from(material.iv, "base64"));
  decipher.setAuthTag(Buffer.from(material.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(material.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

async function appendLog(entry) {
  await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
  await fs.appendFile(LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

async function telegram(token, method, body) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(`Telegram ${method} failed: ${JSON.stringify(json)}`);
  return json.result;
}

async function loadTelegramConfig(sql) {
  const [plugin] = await sql`select id from plugins where plugin_key=${PLUGIN_KEY} limit 1`;
  if (!plugin?.id) throw new Error(`Plugin not found: ${PLUGIN_KEY}`);
  const [configRow] = await sql`select config_json from plugin_config where plugin_id=${plugin.id} limit 1`;
  const config = configRow?.config_json ?? {};
  const tokenRef = config.telegramBotTokenRef;
  const chatId = config.defaultChatId;
  if (!tokenRef || !chatId) throw new Error("Telegram token ref or default chat id missing");
  const [secret] = await sql`
    select csv.material
    from company_secrets cs
    join company_secret_versions csv on csv.secret_id=cs.id and csv.version=cs.latest_version
    where cs.id=${tokenRef}
  `;
  if (!secret?.material) throw new Error("Telegram token secret material missing");
  const masterKey = decodeMasterKey(await fs.readFile(MASTER_KEY_FILE, "utf8"));
  return { pluginId: plugin.id, token: decryptSecret(masterKey, secret.material), chatId: String(chatId) };
}

async function upsertPluginState(sql, pluginId, stateKey, valueJson) {
  await sql`
    insert into plugin_state (id, plugin_id, scope_kind, scope_id, namespace, state_key, value_json, updated_at)
    values (${randomUUID()}, ${pluginId}, 'instance', null, 'default', ${stateKey}, ${sql.json(valueJson)}, now())
    on conflict (plugin_id, scope_kind, scope_id, namespace, state_key)
    do update set value_json=excluded.value_json, updated_at=now()
  `;
}

async function getThreadIndex(sql) {
  const [row] = await sql`
    select value_json from plugin_state ps
    join plugins p on p.id=ps.plugin_id
    where p.plugin_key=${PLUGIN_KEY} and ps.scope_kind='instance' and ps.namespace='default' and ps.state_key='telegram-thread-index'
  `;
  const threads = Array.isArray(row?.value_json?.threads) ? row.value_json.threads : [];
  return { threads };
}

async function runOnce(sql, cfg, ordinal) {
  const stamp = new Date().toISOString();
  const seed = await telegram(cfg.token, "sendMessage", {
    chat_id: cfg.chatId,
    text: `Paperclip Telegram smoke ${label} #${ordinal}: bridge seed. A reply should follow if the Paperclip-to-Telegram bridge is healthy.`,
    disable_web_page_preview: true,
  });

  const [numberRow] = await sql`select coalesce(max(issue_number), 0) + 1 as next_number from issues where company_id=${COMPANY_ID}`;
  const issueNumber = Number(numberRow.next_number);
  const identifier = `IAN-${issueNumber}`;
  const title = `CoS Conversation: Telegram bridge smoke ${label} #${ordinal}`;
  const description = `Synthetic Telegram bridge smoke test created at ${stamp}. This does not wake Codex.`;
  const [issue] = await sql`
    insert into issues (
      company_id, title, description, status, priority, assignee_agent_id,
      created_by_user_id, issue_number, identifier, origin_kind, origin_id, origin_fingerprint,
      created_at, updated_at
    ) values (
      ${COMPANY_ID}, ${title}, ${description}, 'in_progress', 'low', ${CODEX_AGENT_ID},
      'telegram-cos-smoke', ${issueNumber}, ${identifier}, 'telegram:cos-smoke',
      ${`telegram-cos-smoke-${Date.now()}-${ordinal}`}, ${`telegram-cos-smoke-${label}`}, now(), now()
    ) returning id, identifier, title
  `;
  const [seedComment] = await sql`
    insert into issue_comments (id, issue_id, company_id, body, author_type, author_user_id, created_at, updated_at)
    values (${randomUUID()}, ${issue.id}, ${COMPANY_ID}, ${description}, 'system', 'telegram-cos-smoke', now(), now())
    returning id
  `;

  const index = await getThreadIndex(sql);
  const nextThread = {
    issueId: issue.id,
    identifier: issue.identifier,
    companyId: COMPANY_ID,
    chatId: cfg.chatId,
    messageId: seed.message_id,
    lastCommentId: seedComment.id,
    createdAt: new Date().toISOString(),
  };
  index.threads = [nextThread, ...index.threads.filter((thread) => thread?.issueId !== issue.id)].slice(0, 100);
  await upsertPluginState(sql, cfg.pluginId, "telegram-thread-index", index);
  await upsertPluginState(sql, cfg.pluginId, `msg_${cfg.chatId}_${seed.message_id}`, {
    entityId: issue.id,
    entityType: "issue",
    companyId: COMPANY_ID,
    eventType: "telegram.cos-smoke.created",
  });

  const replyText = `Smoke reply for ${issue.identifier}: Paperclip-to-Telegram bridge is forwarding agent comments. ${PUBLIC_URL}/IAN/issues/${issue.identifier}`;
  const [agentComment] = await sql`
    insert into issue_comments (id, issue_id, company_id, body, author_type, author_agent_id, created_at, updated_at)
    values (${randomUUID()}, ${issue.id}, ${COMPANY_ID}, ${replyText}, 'agent', ${CODEX_AGENT_ID}, now(), now())
    returning id
  `;

  const deadline = Date.now() + waitSec * 1000;
  let passed = false;
  let latestThread = null;
  while (Date.now() < deadline) {
    await sleep(5000);
    const current = await getThreadIndex(sql);
    latestThread = current.threads.find((thread) => thread?.issueId === issue.id) ?? null;
    if (latestThread?.lastCommentId === agentComment.id) {
      passed = true;
      break;
    }
  }

  await sql`update issues set status=${passed ? 'done' : 'blocked'}, updated_at=now() where id=${issue.id}`;
  const result = {
    label,
    ordinal,
    ok: passed,
    issue: issue.identifier,
    issueId: issue.id,
    seedMessageId: seed.message_id,
    agentCommentId: agentComment.id,
    observedLastCommentId: latestThread?.lastCommentId ?? null,
  };
  await appendLog(result);
  console.log(JSON.stringify(result));
  return result;
}

const sql = postgres(DB_URL, { max: 1 });
try {
  const cfg = await loadTelegramConfig(sql);
  let failures = 0;
  for (let i = 1; i <= iterations; i += 1) {
    const result = await runOnce(sql, cfg, i);
    if (!result.ok) failures += 1;
    if (i < iterations) await sleep(intervalSec * 1000);
  }
  process.exitCode = failures ? 1 : 0;
} finally {
  await sql.end({ timeout: 1 }).catch(() => undefined);
}
