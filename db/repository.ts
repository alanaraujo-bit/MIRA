import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { applyUtmParameters, normalizeSlug, normalizeTag, type UtmFields } from "../lib/link-rules";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
type WorkspaceRow = { id: string; name: string; slug: string; role: WorkspaceRole };
export type LinkStatus = "active" | "archived" | "blocked";
export type LinkRow = {
  id: string; workspace_id: string; title: string; destination_url: string; slug: string;
  campaign_id: string | null; campaign_name: string | null; channel: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  utm_content: string | null; utm_term: string | null; tags: string[]; status: LinkStatus;
  created_at: number; updated_at: number; clicks: number;
};
export type CampaignStatus = "planning" | "active" | "ended";
export type CampaignRow = {
  id: string; workspace_id: string; name: string; objective: string | null; status: CampaignStatus;
  starts_at: number | null; ends_at: number | null; created_at: number; updated_at: number;
  links: number; clicks: number;
};
export type TagRow = { id: string; name: string; normalized_name: string; links: number };

function database(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    const d1 = database();
    await d1.batch([
      d1.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL,
        display_name TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
        slug TEXT NOT NULL, owner_user_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS workspace_members (workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL, created_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, user_id))`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS campaigns (id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name TEXT NOT NULL, objective TEXT,
        status TEXT DEFAULT 'active' NOT NULL, starts_at INTEGER, ends_at INTEGER,
        created_by_user_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS links (id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, title TEXT NOT NULL,
        destination_url TEXT NOT NULL, slug TEXT NOT NULL, campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
        channel TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT,
        status TEXT DEFAULT 'active' NOT NULL, created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS click_events (id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE, referrer_host TEXT, device_class TEXT NOT NULL, occurred_at INTEGER NOT NULL)`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name TEXT NOT NULL,
        normalized_name TEXT NOT NULL, created_at INTEGER NOT NULL)`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS link_tags (link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE, PRIMARY KEY (link_id, tag_id))`),
    ]);
    const columns = await d1.prepare("PRAGMA table_info(links)").all<{ name: string }>();
    const names = new Set(columns.results.map((column) => column.name));
    const additions: Record<string, string> = {
      campaign_id: "TEXT REFERENCES campaigns(id) ON DELETE SET NULL", channel: "TEXT", utm_source: "TEXT",
      utm_medium: "TEXT", utm_campaign: "TEXT", utm_content: "TEXT", utm_term: "TEXT",
    };
    for (const [name, definition] of Object.entries(additions)) {
      if (!names.has(name)) await d1.prepare(`ALTER TABLE links ADD COLUMN ${name} ${definition}`).run();
    }
    await d1.batch([
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_updated ON campaigns(workspace_id, updated_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_status ON campaigns(workspace_id, status)"),
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_links_slug ON links(slug)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_updated ON links(workspace_id, updated_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_status ON links(workspace_id, status)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_campaign ON links(workspace_id, campaign_id)"),
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_workspace_normalized ON tags(workspace_id, normalized_name)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_link_tags_tag ON link_tags(tag_id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_click_events_workspace_time ON click_events(workspace_id, occurred_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_click_events_link_time ON click_events(link_id, occurred_at)"),
      d1.prepare("PRAGMA optimize"),
    ]);
  })().catch((error) => { schemaReady = null; throw error; });
  return schemaReady;
}

export async function ensureUser(user: ChatGPTUser): Promise<void> {
  await ensureSchema();
  const now = Date.now();
  await database().prepare(`INSERT INTO users (id, email, display_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name, updated_at = excluded.updated_at`)
    .bind(user.userId, user.email, user.fullName ?? user.displayName, now, now).run();
}

export async function listWorkspaces(userId: string): Promise<WorkspaceRow[]> {
  await ensureSchema();
  const result = await database().prepare(`SELECT w.id, w.name, w.slug, wm.role FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id WHERE wm.user_id = ? ORDER BY w.created_at ASC`)
    .bind(userId).all<WorkspaceRow>();
  return result.results;
}

export async function createWorkspace(user: ChatGPTUser, requestedName?: string): Promise<WorkspaceRow> {
  await ensureUser(user);
  const id = crypto.randomUUID();
  const name = (requestedName?.trim() || `${user.displayName.split(" ")[0]} Workspace`).slice(0, 80);
  const slug = `${normalizeSlug(name).slice(0, 32)}-${id.slice(0, 6)}`;
  const now = Date.now();
  const d1 = database();
  await d1.batch([
    d1.prepare("INSERT INTO workspaces (id, name, slug, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, name, slug, user.userId, now, now),
    d1.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)")
      .bind(id, user.userId, now),
  ]);
  return { id, name, slug, role: "owner" };
}

export async function ensureDefaultWorkspace(user: ChatGPTUser): Promise<WorkspaceRow> {
  await ensureUser(user);
  const existing = await listWorkspaces(user.userId);
  return existing[0] ?? createWorkspace(user);
}

export async function requireWorkspace(userId: string, workspaceId: string): Promise<WorkspaceRow> {
  await ensureSchema();
  const row = await database().prepare(`SELECT w.id, w.name, w.slug, wm.role FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id WHERE w.id = ? AND wm.user_id = ? LIMIT 1`)
    .bind(workspaceId, userId).first<WorkspaceRow>();
  if (!row) throw new Error("WORKSPACE_FORBIDDEN");
  return row;
}

function canWrite(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

async function requireWrite(userId: string, workspaceId: string): Promise<void> {
  const workspace = await requireWorkspace(userId, workspaceId);
  if (!canWrite(workspace.role)) throw new Error("WORKSPACE_READ_ONLY");
}

function escapeLike(value: string): string { return value.replace(/[\\%_]/g, "\\$&"); }
function cleanNullable(value: string | null | undefined, limit = 100): string | null {
  const cleaned = value?.trim().slice(0, limit);
  return cleaned || null;
}

type LinkSqlRow = Omit<LinkRow, "tags" | "clicks"> & { tag_names: string | null; clicks: number };
function hydrateLink(row: LinkSqlRow): LinkRow {
  const { tag_names, ...link } = row;
  return { ...link, clicks: Number(link.clicks), tags: tag_names ? tag_names.split("\u001f") : [] };
}

const linkSelect = `SELECT l.id, l.workspace_id, l.title, l.destination_url, l.slug,
  l.campaign_id, c.name AS campaign_name, l.channel, l.utm_source, l.utm_medium,
  l.utm_campaign, l.utm_content, l.utm_term, l.status, l.created_at, l.updated_at,
  (SELECT COUNT(*) FROM click_events ce WHERE ce.link_id = l.id) AS clicks,
  (SELECT GROUP_CONCAT(t.name, char(31)) FROM link_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.link_id = l.id) AS tag_names
  FROM links l LEFT JOIN campaigns c ON c.id = l.campaign_id`;

export async function listLinks(userId: string, workspaceId: string, options: {
  query?: string; status?: "all" | "active" | "archived"; campaignId?: string; tag?: string;
} = {}): Promise<LinkRow[]> {
  await requireWorkspace(userId, workspaceId);
  const query = options.query?.trim().toLocaleLowerCase("pt-BR").slice(0, 100) ?? "";
  const pattern = `%${escapeLike(query)}%`;
  const status = options.status ?? "all";
  const campaignId = options.campaignId?.trim() ?? "";
  const tag = normalizeTag(options.tag ?? "")?.normalizedName ?? "";
  const result = await database().prepare(`${linkSelect}
    WHERE l.workspace_id = ? AND (? = '' OR LOWER(l.title) LIKE ? ESCAPE '\\' OR LOWER(l.slug) LIKE ? ESCAPE '\\' OR LOWER(l.destination_url) LIKE ? ESCAPE '\\')
      AND (? = 'all' OR l.status = ?) AND (? = '' OR l.campaign_id = ?)
      AND (? = '' OR EXISTS (SELECT 1 FROM link_tags flt JOIN tags ft ON ft.id = flt.tag_id WHERE flt.link_id = l.id AND ft.normalized_name = ?))
    ORDER BY l.updated_at DESC LIMIT 100`)
    .bind(workspaceId, query, pattern, pattern, pattern, status, status, campaignId, campaignId, tag, tag).all<LinkSqlRow>();
  return result.results.map(hydrateLink);
}

async function assertCampaign(workspaceId: string, campaignId: string | null): Promise<void> {
  if (!campaignId) return;
  const row = await database().prepare("SELECT id FROM campaigns WHERE id = ? AND workspace_id = ?")
    .bind(campaignId, workspaceId).first();
  if (!row) throw new Error("A campanha selecionada não pertence a este Workspace.");
}

async function syncLinkTags(workspaceId: string, linkId: string, values: string[]): Promise<void> {
  const mapped = values.map(normalizeTag).filter((tag): tag is NonNullable<ReturnType<typeof normalizeTag>> => Boolean(tag));
  const normalized = [...new Map(mapped.map((tag) => [tag.normalizedName, tag])).values()].slice(0, 8);
  const d1 = database();
  await d1.prepare("DELETE FROM link_tags WHERE link_id = ?").bind(linkId).run();
  for (const tag of normalized) {
    await d1.prepare(`INSERT INTO tags (id, workspace_id, name, normalized_name, created_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(workspace_id, normalized_name) DO UPDATE SET name = excluded.name`)
      .bind(crypto.randomUUID(), workspaceId, tag.name, tag.normalizedName, Date.now()).run();
    const row = await d1.prepare("SELECT id FROM tags WHERE workspace_id = ? AND normalized_name = ?")
      .bind(workspaceId, tag.normalizedName).first<{ id: string }>();
    if (row) await d1.prepare("INSERT OR IGNORE INTO link_tags (link_id, tag_id) VALUES (?, ?)").bind(linkId, row.id).run();
  }
}

export async function createLink(input: {
  userId: string; workspaceId: string; title: string; destinationUrl: string; slug?: string;
  campaignId?: string | null; channel?: string | null; tags?: string[]; utm?: UtmFields;
}): Promise<LinkRow> {
  await requireWrite(input.userId, input.workspaceId);
  const campaignId = cleanNullable(input.campaignId, 64);
  await assertCampaign(input.workspaceId, campaignId);
  const destinationUrl = applyUtmParameters(input.destinationUrl, input.utm ?? {});
  const title = input.title.trim().slice(0, 100);
  if (!title) throw new Error("Dê um nome ao link.");
  const slug = normalizeSlug(input.slug?.trim() || title);
  if (slug.length < 3 || slug.length > 48) throw new Error("O slug deve ter entre 3 e 48 caracteres.");
  const id = crypto.randomUUID();
  const now = Date.now();
  const channel = cleanNullable(input.channel, 50);
  const utm = input.utm ?? {};
  try {
    await database().prepare(`INSERT INTO links (id, workspace_id, title, destination_url, slug, campaign_id, channel,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, status, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`)
      .bind(id, input.workspaceId, title, destinationUrl, slug, campaignId, channel,
        cleanNullable(utm.source), cleanNullable(utm.medium), cleanNullable(utm.campaign), cleanNullable(utm.content),
        cleanNullable(utm.term), input.userId, now, now).run();
    await syncLinkTags(input.workspaceId, id, input.tags ?? []);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("Este slug já está em uso.");
    throw error;
  }
  return (await linkForMember(input.userId, id)).link;
}

async function linkForMember(userId: string, linkId: string): Promise<{ link: LinkRow; role: WorkspaceRole }> {
  await ensureSchema();
  const row = await database().prepare(`${linkSelect}
    WHERE l.id = ? AND EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = l.workspace_id AND wm.user_id = ?) LIMIT 1`)
    .bind(linkId, userId).first<LinkSqlRow>();
  if (!row) throw new Error("LINK_NOT_FOUND");
  const role = await database().prepare("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?")
    .bind(row.workspace_id, userId).first<{ role: WorkspaceRole }>();
  return { link: hydrateLink(row), role: role!.role };
}

export async function getLinkForMember(userId: string, linkId: string): Promise<LinkRow> {
  return (await linkForMember(userId, linkId)).link;
}

export async function updateLink(input: {
  userId: string; linkId: string; title?: string; destinationUrl?: string; slug?: string;
  campaignId?: string | null; channel?: string | null; tags?: string[]; utm?: UtmFields;
  status?: "active" | "archived"; expectedUpdatedAt: number;
}): Promise<LinkRow> {
  const { link: existing, role } = await linkForMember(input.userId, input.linkId);
  if (!canWrite(role)) throw new Error("WORKSPACE_READ_ONLY");
  const title = input.title === undefined ? existing.title : input.title.trim().slice(0, 100);
  if (!title) throw new Error("Dê um nome ao link.");
  const utm: UtmFields = input.utm ?? { source: existing.utm_source, medium: existing.utm_medium,
    campaign: existing.utm_campaign, content: existing.utm_content, term: existing.utm_term };
  const destinationUrl = applyUtmParameters(input.destinationUrl ?? existing.destination_url, utm);
  const slug = input.slug === undefined ? existing.slug : normalizeSlug(input.slug.trim());
  if (slug.length < 3 || slug.length > 48) throw new Error("O slug deve ter entre 3 e 48 caracteres.");
  const status = input.status ?? existing.status;
  if (status === "blocked") throw new Error("Links bloqueados exigem revisão interna.");
  const campaignId = input.campaignId === undefined ? existing.campaign_id : cleanNullable(input.campaignId, 64);
  await assertCampaign(existing.workspace_id, campaignId);
  const channel = input.channel === undefined ? existing.channel : cleanNullable(input.channel, 50);
  const now = Math.max(Date.now(), input.expectedUpdatedAt + 1);
  try {
    const result = await database().prepare(`UPDATE links SET title = ?, destination_url = ?, slug = ?, campaign_id = ?, channel = ?,
      utm_source = ?, utm_medium = ?, utm_campaign = ?, utm_content = ?, utm_term = ?, status = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ? AND updated_at = ?`)
      .bind(title, destinationUrl, slug, campaignId, channel, cleanNullable(utm.source), cleanNullable(utm.medium),
        cleanNullable(utm.campaign), cleanNullable(utm.content), cleanNullable(utm.term), status, now,
        existing.id, existing.workspace_id, input.expectedUpdatedAt).run();
    if (!result.meta.changes) throw new Error("LINK_CONFLICT");
    if (input.tags !== undefined) await syncLinkTags(existing.workspace_id, existing.id, input.tags);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("Este slug já está em uso.");
    throw error;
  }
  return (await linkForMember(input.userId, input.linkId)).link;
}

export async function listCampaigns(userId: string, workspaceId: string): Promise<CampaignRow[]> {
  await requireWorkspace(userId, workspaceId);
  const result = await database().prepare(`SELECT c.id, c.workspace_id, c.name, c.objective, c.status,
    c.starts_at, c.ends_at, c.created_at, c.updated_at, COUNT(DISTINCT l.id) AS links, COUNT(ce.id) AS clicks
    FROM campaigns c LEFT JOIN links l ON l.campaign_id = c.id LEFT JOIN click_events ce ON ce.link_id = l.id
    WHERE c.workspace_id = ? GROUP BY c.id ORDER BY c.updated_at DESC`).bind(workspaceId).all<CampaignRow>();
  return result.results.map((row) => ({ ...row, links: Number(row.links), clicks: Number(row.clicks) }));
}

export async function createCampaign(input: {
  userId: string; workspaceId: string; name: string; objective?: string | null; status?: CampaignStatus;
  startsAt?: number | null; endsAt?: number | null;
}): Promise<CampaignRow> {
  await requireWrite(input.userId, input.workspaceId);
  const name = input.name.trim().slice(0, 100);
  if (!name) throw new Error("Dê um nome à campanha.");
  const id = crypto.randomUUID();
  const now = Date.now();
  const status = input.status ?? "active";
  const objective = cleanNullable(input.objective, 240);
  await database().prepare(`INSERT INTO campaigns (id, workspace_id, name, objective, status, starts_at, ends_at,
    created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, input.workspaceId, name, objective, status, input.startsAt ?? null, input.endsAt ?? null, input.userId, now, now).run();
  return { id, workspace_id: input.workspaceId, name, objective, status, starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null, created_at: now, updated_at: now, links: 0, clicks: 0 };
}

export async function updateCampaign(input: {
  userId: string; campaignId: string; name?: string; objective?: string | null; status?: CampaignStatus;
  startsAt?: number | null; endsAt?: number | null; expectedUpdatedAt: number;
}): Promise<CampaignRow> {
  await ensureSchema();
  const existing = await database().prepare(`SELECT c.*, wm.role FROM campaigns c JOIN workspace_members wm
    ON wm.workspace_id = c.workspace_id WHERE c.id = ? AND wm.user_id = ? LIMIT 1`)
    .bind(input.campaignId, input.userId).first<CampaignRow & { role: WorkspaceRole }>();
  if (!existing) throw new Error("CAMPAIGN_NOT_FOUND");
  if (!canWrite(existing.role)) throw new Error("WORKSPACE_READ_ONLY");
  const name = input.name === undefined ? existing.name : input.name.trim().slice(0, 100);
  if (!name) throw new Error("Dê um nome à campanha.");
  const now = Math.max(Date.now(), input.expectedUpdatedAt + 1);
  const result = await database().prepare(`UPDATE campaigns SET name = ?, objective = ?, status = ?, starts_at = ?, ends_at = ?, updated_at = ?
    WHERE id = ? AND updated_at = ?`).bind(name,
      input.objective === undefined ? existing.objective : cleanNullable(input.objective, 240), input.status ?? existing.status,
      input.startsAt === undefined ? existing.starts_at : input.startsAt, input.endsAt === undefined ? existing.ends_at : input.endsAt,
      now, input.campaignId, input.expectedUpdatedAt).run();
  if (!result.meta.changes) throw new Error("CAMPAIGN_CONFLICT");
  return (await listCampaigns(input.userId, existing.workspace_id)).find((campaign) => campaign.id === input.campaignId)!;
}

export async function listTags(userId: string, workspaceId: string): Promise<TagRow[]> {
  await requireWorkspace(userId, workspaceId);
  const result = await database().prepare(`SELECT t.id, t.name, t.normalized_name, COUNT(lt.link_id) AS links
    FROM tags t LEFT JOIN link_tags lt ON lt.tag_id = t.id WHERE t.workspace_id = ?
    GROUP BY t.id ORDER BY links DESC, t.name ASC`).bind(workspaceId).all<TagRow>();
  return result.results.map((row) => ({ ...row, links: Number(row.links) }));
}

export async function workspaceSummary(userId: string, workspaceId: string) {
  await requireWorkspace(userId, workspaceId);
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [linksRow, clicksRow, devicesResult] = await Promise.all([
    database().prepare("SELECT COUNT(*) AS total FROM links WHERE workspace_id = ? AND status = 'active'").bind(workspaceId).first<{ total: number }>(),
    database().prepare("SELECT COUNT(*) AS total FROM click_events WHERE workspace_id = ? AND occurred_at >= ?").bind(workspaceId, since).first<{ total: number }>(),
    database().prepare(`SELECT device_class, COUNT(*) AS total FROM click_events WHERE workspace_id = ? AND occurred_at >= ?
      GROUP BY device_class ORDER BY total DESC`).bind(workspaceId, since).all<{ device_class: string; total: number }>(),
  ]);
  return { activeLinks: Number(linksRow?.total ?? 0), clicks7d: Number(clicksRow?.total ?? 0),
    devices: devicesResult.results.map((row) => ({ name: row.device_class, value: Number(row.total) })) };
}
