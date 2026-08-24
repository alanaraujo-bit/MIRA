import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { normalizeDomainHostname, type DomainDnsResult } from "../lib/domain-verification";
import { applyUtmParameters, normalizeSlug, normalizeTag, normalizeUtmValue, type UtmFields } from "../lib/link-rules";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
type WorkspaceRow = { id: string; name: string; slug: string; role: WorkspaceRole };
export type LinkStatus = "active" | "archived" | "blocked";
export type LinkRow = {
  id: string; workspace_id: string; title: string; destination_url: string; slug: string;
  domain_id: string | null; domain_hostname: string | null; campaign_id: string | null; campaign_name: string | null; channel: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null;
  utm_content: string | null; utm_term: string | null; tags: string[]; status: LinkStatus;
  created_at: number; updated_at: number; clicks: number; is_favorite: boolean;
};
export type CampaignStatus = "planning" | "active" | "ended";
export type CampaignRow = {
  id: string; workspace_id: string; name: string; objective: string | null; status: CampaignStatus;
  starts_at: number | null; ends_at: number | null; created_at: number; updated_at: number;
  links: number; clicks: number;
};
export type TagRow = { id: string; name: string; normalized_name: string; links: number };
export type UtmPresetRow = {
  id: string; workspace_id: string; name: string; normalized_name: string; source: string | null;
  medium: string | null; campaign: string | null; content: string | null; term: string | null;
  created_at: number; updated_at: number;
};
export type DomainStatus = "pending" | "verified" | "active" | "error";
export type DomainDnsStatus = "pending" | "verified" | "mismatch" | "unreachable";
export type DomainRow = {
  id: string; workspace_id: string; hostname: string; verification_token: string; status: DomainStatus;
  dns_status: DomainDnsStatus; ssl_status: "pending" | "active" | "error"; last_error: string | null;
  verified_at: number | null; last_checked_at: number | null; created_at: number; updated_at: number;
};
export type LinkPage = { links: LinkRow[]; nextCursor: string | null; total: number };
export type CampaignDetail = CampaignRow & {
  channels: { channel: string; links: number; clicks: number }[];
  top_links: { id: string; title: string; slug: string; channel: string | null; status: LinkStatus; clicks: number }[];
};

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
      d1.prepare(`CREATE TABLE IF NOT EXISTS domains (id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, hostname TEXT NOT NULL,
        verification_token TEXT NOT NULL, status TEXT DEFAULT 'pending' NOT NULL,
        dns_status TEXT DEFAULT 'pending' NOT NULL, ssl_status TEXT DEFAULT 'pending' NOT NULL,
        last_error TEXT, verified_at INTEGER, last_checked_at INTEGER,
        created_by_user_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS links (id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, title TEXT NOT NULL,
        destination_url TEXT NOT NULL, slug TEXT NOT NULL, domain_id TEXT REFERENCES domains(id) ON DELETE SET NULL,
        campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
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
      d1.prepare(`CREATE TABLE IF NOT EXISTS link_favorites (link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at INTEGER NOT NULL,
        PRIMARY KEY (link_id, user_id))`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS utm_presets (id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE, name TEXT NOT NULL,
        normalized_name TEXT NOT NULL, source TEXT, medium TEXT, campaign TEXT, content TEXT, term TEXT,
        created_by_user_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`),
    ]);
    const columns = await d1.prepare("PRAGMA table_info(links)").all<{ name: string }>();
    const names = new Set(columns.results.map((column) => column.name));
    const additions: Record<string, string> = {
      campaign_id: "TEXT REFERENCES campaigns(id) ON DELETE SET NULL", channel: "TEXT", utm_source: "TEXT",
      utm_medium: "TEXT", utm_campaign: "TEXT", utm_content: "TEXT", utm_term: "TEXT",
      domain_id: "TEXT REFERENCES domains(id) ON DELETE SET NULL",
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
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_hostname ON domains(hostname)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_domains_workspace_updated ON domains(workspace_id, updated_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_domains_workspace_status ON domains(workspace_id, status)"),
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_links_slug ON links(slug)"),
      d1.prepare("DROP INDEX IF EXISTS idx_links_workspace_updated"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_updated_id ON links(workspace_id, updated_at, id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_status ON links(workspace_id, status)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_campaign ON links(workspace_id, campaign_id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_domain ON links(workspace_id, domain_id)"),
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_workspace_normalized ON tags(workspace_id, normalized_name)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_link_tags_tag ON link_tags(tag_id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_link_favorites_user_created ON link_favorites(user_id, created_at)"),
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_utm_presets_workspace_normalized ON utm_presets(workspace_id, normalized_name)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_utm_presets_workspace_updated ON utm_presets(workspace_id, updated_at)"),
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

type LinkSqlRow = Omit<LinkRow, "tags" | "clicks" | "is_favorite"> & { tag_names: string | null; clicks: number; is_favorite: number };
function hydrateLink(row: LinkSqlRow): LinkRow {
  const { tag_names, is_favorite, ...link } = row;
  return { ...link, clicks: Number(link.clicks), is_favorite: Boolean(is_favorite), tags: tag_names ? tag_names.split("\u001f") : [] };
}

const linkSelect = `SELECT l.id, l.workspace_id, l.title, l.destination_url, l.slug,
  l.domain_id, d.hostname AS domain_hostname, l.campaign_id, c.name AS campaign_name, l.channel, l.utm_source, l.utm_medium,
  l.utm_campaign, l.utm_content, l.utm_term, l.status, l.created_at, l.updated_at,
  (SELECT COUNT(*) FROM click_events ce WHERE ce.link_id = l.id) AS clicks,
  EXISTS(SELECT 1 FROM link_favorites lf WHERE lf.link_id = l.id AND lf.user_id = ?) AS is_favorite,
  (SELECT GROUP_CONCAT(t.name, char(31)) FROM link_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.link_id = l.id) AS tag_names
  FROM links l LEFT JOIN campaigns c ON c.id = l.campaign_id LEFT JOIN domains d ON d.id = l.domain_id`;

function encodeLinkCursor(updatedAt: number, id: string): string {
  return btoa(`${updatedAt}:${id}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeLinkCursor(value: string | undefined): { updatedAt: number; id: string } {
  if (!value) return { updatedAt: 0, id: "" };
  try {
    const decoded = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const separator = decoded.indexOf(":");
    const updatedAt = Number(decoded.slice(0, separator));
    const id = decoded.slice(separator + 1);
    if (!Number.isSafeInteger(updatedAt) || updatedAt <= 0 || !/^[0-9a-f-]{36}$/i.test(id)) throw new Error();
    return { updatedAt, id };
  } catch {
    throw new Error("CURSOR_INVALID");
  }
}

export async function listLinks(userId: string, workspaceId: string, options: {
  query?: string; status?: "all" | "active" | "archived"; campaignId?: string; tag?: string;
  favorites?: boolean; cursor?: string; limit?: number;
} = {}): Promise<LinkPage> {
  await requireWorkspace(userId, workspaceId);
  const query = options.query?.trim().toLocaleLowerCase("pt-BR").slice(0, 100) ?? "";
  const pattern = `%${escapeLike(query)}%`;
  const status = options.status ?? "all";
  const campaignId = options.campaignId?.trim() ?? "";
  const tag = normalizeTag(options.tag ?? "")?.normalizedName ?? "";
  const favorites = options.favorites ? 1 : 0;
  const cursor = decodeLinkCursor(options.cursor);
  const requestedLimit = Number.isFinite(options.limit) ? Math.trunc(options.limit!) : 25;
  const limit = Math.min(50, Math.max(10, requestedLimit));
  const filterSql = `l.workspace_id = ? AND (? = '' OR LOWER(l.title) LIKE ? ESCAPE '\\' OR LOWER(l.slug) LIKE ? ESCAPE '\\' OR LOWER(l.destination_url) LIKE ? ESCAPE '\\')
      AND (? = 'all' OR l.status = ?) AND (? = '' OR l.campaign_id = ?)
      AND (? = '' OR EXISTS (SELECT 1 FROM link_tags flt JOIN tags ft ON ft.id = flt.tag_id WHERE flt.link_id = l.id AND ft.normalized_name = ?))
      AND (? = 0 OR EXISTS (SELECT 1 FROM link_favorites ff WHERE ff.link_id = l.id AND ff.user_id = ?))`;
  const filterBindings = [workspaceId, query, pattern, pattern, pattern, status, status, campaignId, campaignId, tag, tag, favorites, userId] as const;
  const result = await database().prepare(`${linkSelect}
    WHERE ${filterSql} AND (? = 0 OR l.updated_at < ? OR (l.updated_at = ? AND l.id < ?))
    ORDER BY l.updated_at DESC, l.id DESC LIMIT ?`)
    .bind(userId, ...filterBindings, cursor.updatedAt, cursor.updatedAt, cursor.updatedAt, cursor.id, limit + 1).all<LinkSqlRow>();
  const totalRow = await database().prepare(`SELECT COUNT(*) AS total FROM links l WHERE ${filterSql}`)
    .bind(...filterBindings).first<{ total: number }>();
  const hasMore = result.results.length > limit;
  const rows = result.results.slice(0, limit);
  const last = rows.at(-1);
  return { links: rows.map(hydrateLink), total: Number(totalRow?.total ?? 0),
    nextCursor: hasMore && last ? encodeLinkCursor(last.updated_at, last.id) : null };
}

async function assertCampaign(workspaceId: string, campaignId: string | null): Promise<void> {
  if (!campaignId) return;
  const row = await database().prepare("SELECT id FROM campaigns WHERE id = ? AND workspace_id = ?")
    .bind(campaignId, workspaceId).first();
  if (!row) throw new Error("A campanha selecionada não pertence a este Workspace.");
}

async function assertDomain(workspaceId: string, domainId: string | null): Promise<void> {
  if (!domainId) return;
  const row = await database().prepare("SELECT id FROM domains WHERE id = ? AND workspace_id = ?")
    .bind(domainId, workspaceId).first();
  if (!row) throw new Error("O domínio selecionado não pertence a este Workspace.");
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
  domainId?: string | null; campaignId?: string | null; channel?: string | null; tags?: string[]; utm?: UtmFields;
}): Promise<LinkRow> {
  await requireWrite(input.userId, input.workspaceId);
  const campaignId = cleanNullable(input.campaignId, 64);
  const domainId = cleanNullable(input.domainId, 64);
  await assertCampaign(input.workspaceId, campaignId);
  await assertDomain(input.workspaceId, domainId);
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
    await database().prepare(`INSERT INTO links (id, workspace_id, title, destination_url, slug, domain_id, campaign_id, channel,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, status, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`)
      .bind(id, input.workspaceId, title, destinationUrl, slug, domainId, campaignId, channel,
        normalizeUtmValue(utm.source), normalizeUtmValue(utm.medium), normalizeUtmValue(utm.campaign), normalizeUtmValue(utm.content),
        normalizeUtmValue(utm.term), input.userId, now, now).run();
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
    .bind(userId, linkId, userId).first<LinkSqlRow>();
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
  domainId?: string | null; campaignId?: string | null; channel?: string | null; tags?: string[]; utm?: UtmFields;
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
  const domainId = input.domainId === undefined ? existing.domain_id : cleanNullable(input.domainId, 64);
  await assertCampaign(existing.workspace_id, campaignId);
  await assertDomain(existing.workspace_id, domainId);
  const channel = input.channel === undefined ? existing.channel : cleanNullable(input.channel, 50);
  const now = Math.max(Date.now(), input.expectedUpdatedAt + 1);
  try {
    const result = await database().prepare(`UPDATE links SET title = ?, destination_url = ?, slug = ?, domain_id = ?, campaign_id = ?, channel = ?,
      utm_source = ?, utm_medium = ?, utm_campaign = ?, utm_content = ?, utm_term = ?, status = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ? AND updated_at = ?`)
      .bind(title, destinationUrl, slug, domainId, campaignId, channel, normalizeUtmValue(utm.source), normalizeUtmValue(utm.medium),
        normalizeUtmValue(utm.campaign), normalizeUtmValue(utm.content), normalizeUtmValue(utm.term), status, now,
        existing.id, existing.workspace_id, input.expectedUpdatedAt).run();
    if (!result.meta.changes) throw new Error("LINK_CONFLICT");
    if (input.tags !== undefined) await syncLinkTags(existing.workspace_id, existing.id, input.tags);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("Este slug já está em uso.");
    throw error;
  }
  return (await linkForMember(input.userId, input.linkId)).link;
}

export async function setLinkFavorite(userId: string, linkId: string, favorite: boolean): Promise<LinkRow> {
  await linkForMember(userId, linkId);
  if (favorite) {
    await database().prepare("INSERT OR IGNORE INTO link_favorites (link_id, user_id, created_at) VALUES (?, ?, ?)")
      .bind(linkId, userId, Date.now()).run();
  } else {
    await database().prepare("DELETE FROM link_favorites WHERE link_id = ? AND user_id = ?").bind(linkId, userId).run();
  }
  return (await linkForMember(userId, linkId)).link;
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

export async function getCampaignDetail(userId: string, campaignId: string): Promise<CampaignDetail> {
  await ensureSchema();
  const membership = await database().prepare(`SELECT c.workspace_id FROM campaigns c JOIN workspace_members wm
    ON wm.workspace_id = c.workspace_id WHERE c.id = ? AND wm.user_id = ? LIMIT 1`)
    .bind(campaignId, userId).first<{ workspace_id: string }>();
  if (!membership) throw new Error("CAMPAIGN_NOT_FOUND");
  const campaign = (await listCampaigns(userId, membership.workspace_id)).find((item) => item.id === campaignId);
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  const [channels, topLinks] = await Promise.all([
    database().prepare(`SELECT COALESCE(NULLIF(l.channel, ''), 'Sem canal') AS channel,
      COUNT(DISTINCT l.id) AS links, COUNT(ce.id) AS clicks FROM links l
      LEFT JOIN click_events ce ON ce.link_id = l.id WHERE l.campaign_id = ?
      GROUP BY COALESCE(NULLIF(l.channel, ''), 'Sem canal') ORDER BY clicks DESC, links DESC, channel ASC`)
      .bind(campaignId).all<{ channel: string; links: number; clicks: number }>(),
    database().prepare(`SELECT l.id, l.title, l.slug, l.channel, l.status, COUNT(ce.id) AS clicks
      FROM links l LEFT JOIN click_events ce ON ce.link_id = l.id WHERE l.campaign_id = ?
      GROUP BY l.id ORDER BY clicks DESC, l.updated_at DESC LIMIT 50`)
      .bind(campaignId).all<{ id: string; title: string; slug: string; channel: string | null; status: LinkStatus; clicks: number }>(),
  ]);
  return { ...campaign,
    channels: channels.results.map((row) => ({ ...row, links: Number(row.links), clicks: Number(row.clicks) })),
    top_links: topLinks.results.map((row) => ({ ...row, clicks: Number(row.clicks) })) };
}

export async function listUtmPresets(userId: string, workspaceId: string): Promise<UtmPresetRow[]> {
  await requireWorkspace(userId, workspaceId);
  const result = await database().prepare(`SELECT id, workspace_id, name, normalized_name, source, medium,
    campaign, content, term, created_at, updated_at FROM utm_presets WHERE workspace_id = ? ORDER BY updated_at DESC, id DESC`)
    .bind(workspaceId).all<UtmPresetRow>();
  return result.results;
}

export async function createUtmPreset(input: {
  userId: string; workspaceId: string; name: string; utm: UtmFields;
}): Promise<UtmPresetRow> {
  await requireWrite(input.userId, input.workspaceId);
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80);
  const normalizedName = normalizeTag(name)?.normalizedName;
  if (!name || !normalizedName) throw new Error("Dê um nome ao padrão UTM.");
  const id = crypto.randomUUID();
  const now = Date.now();
  const values = { source: normalizeUtmValue(input.utm.source), medium: normalizeUtmValue(input.utm.medium),
    campaign: normalizeUtmValue(input.utm.campaign), content: normalizeUtmValue(input.utm.content), term: normalizeUtmValue(input.utm.term) };
  if (!values.source && !values.medium && !values.campaign && !values.content && !values.term) {
    throw new Error("Preencha ao menos um parâmetro UTM.");
  }
  try {
    await database().prepare(`INSERT INTO utm_presets (id, workspace_id, name, normalized_name, source, medium,
      campaign, content, term, created_by_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, input.workspaceId, name, normalizedName, values.source, values.medium, values.campaign,
        values.content, values.term, input.userId, now, now).run();
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("Já existe um padrão UTM com este nome.");
    throw error;
  }
  return { id, workspace_id: input.workspaceId, name, normalized_name: normalizedName, ...values, created_at: now, updated_at: now };
}

export async function deleteUtmPreset(userId: string, presetId: string): Promise<void> {
  await ensureSchema();
  const row = await database().prepare(`SELECT p.workspace_id, wm.role FROM utm_presets p JOIN workspace_members wm
    ON wm.workspace_id = p.workspace_id WHERE p.id = ? AND wm.user_id = ? LIMIT 1`)
    .bind(presetId, userId).first<{ workspace_id: string; role: WorkspaceRole }>();
  if (!row) throw new Error("UTM_PRESET_NOT_FOUND");
  if (!canWrite(row.role)) throw new Error("WORKSPACE_READ_ONLY");
  await database().prepare("DELETE FROM utm_presets WHERE id = ? AND workspace_id = ?").bind(presetId, row.workspace_id).run();
}

export async function listDomains(userId: string, workspaceId: string): Promise<DomainRow[]> {
  await requireWorkspace(userId, workspaceId);
  const result = await database().prepare(`SELECT id, workspace_id, hostname, verification_token, status,
    dns_status, ssl_status, last_error, verified_at, last_checked_at, created_at, updated_at
    FROM domains WHERE workspace_id = ? ORDER BY updated_at DESC, id DESC`).bind(workspaceId).all<DomainRow>();
  return result.results;
}

export async function createDomain(input: { userId: string; workspaceId: string; hostname: string }): Promise<DomainRow> {
  await requireWrite(input.userId, input.workspaceId);
  const hostname = normalizeDomainHostname(input.hostname);
  const id = crypto.randomUUID();
  const verificationToken = crypto.randomUUID().replace(/-/g, "");
  const now = Date.now();
  try {
    await database().prepare(`INSERT INTO domains (id, workspace_id, hostname, verification_token, status, dns_status,
      ssl_status, last_error, verified_at, last_checked_at, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', 'pending', 'pending', NULL, NULL, NULL, ?, ?, ?)`)
      .bind(id, input.workspaceId, hostname, verificationToken, input.userId, now, now).run();
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("Este domínio já está conectado a um Workspace.");
    throw error;
  }
  return { id, workspace_id: input.workspaceId, hostname, verification_token: verificationToken, status: "pending",
    dns_status: "pending", ssl_status: "pending", last_error: null, verified_at: null, last_checked_at: null,
    created_at: now, updated_at: now };
}

export async function getDomainForMember(userId: string, domainId: string): Promise<{ domain: DomainRow; role: WorkspaceRole }> {
  await ensureSchema();
  const row = await database().prepare(`SELECT d.id, d.workspace_id, d.hostname, d.verification_token, d.status,
    d.dns_status, d.ssl_status, d.last_error, d.verified_at, d.last_checked_at, d.created_at, d.updated_at, wm.role
    FROM domains d JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
    WHERE d.id = ? AND wm.user_id = ? LIMIT 1`).bind(domainId, userId).first<DomainRow & { role: WorkspaceRole }>();
  if (!row) throw new Error("DOMAIN_NOT_FOUND");
  const { role, ...domain } = row;
  return { domain, role };
}

export async function recordDomainDnsCheck(userId: string, domainId: string, result: DomainDnsResult): Promise<DomainRow> {
  const { domain, role } = await getDomainForMember(userId, domainId);
  if (!canWrite(role)) throw new Error("WORKSPACE_READ_ONLY");
  const verified = result.status === "verified";
  const now = Math.max(Date.now(), domain.updated_at + 1);
  await database().prepare(`UPDATE domains SET status = ?, dns_status = ?, last_error = ?, verified_at = ?,
    last_checked_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?`).bind(
      verified ? "verified" : "pending", result.status, result.error, verified ? (domain.verified_at ?? result.checkedAt) : domain.verified_at,
      result.checkedAt, now, domainId, domain.workspace_id).run();
  return (await getDomainForMember(userId, domainId)).domain;
}

export async function deleteDomain(userId: string, domainId: string): Promise<void> {
  const { domain, role } = await getDomainForMember(userId, domainId);
  if (!canWrite(role)) throw new Error("WORKSPACE_READ_ONLY");
  if (domain.status === "active") throw new Error("Desative o domínio antes de removê-lo.");
  await database().prepare("DELETE FROM domains WHERE id = ? AND workspace_id = ?").bind(domainId, domain.workspace_id).run();
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
