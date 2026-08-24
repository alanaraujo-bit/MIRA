import { env } from "cloudflare:workers";
import type { ChatGPTUser } from "../app/chatgpt-auth";
import { normalizeSlug, validateDestination } from "../lib/link-rules";

export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
type WorkspaceRow = { id: string; name: string; slug: string; role: WorkspaceRole };
export type LinkRow = {
  id: string;
  workspace_id: string;
  title: string;
  destination_url: string;
  slug: string;
  status: "active" | "archived" | "blocked";
  created_at: number;
  updated_at: number;
  clicks: number;
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
      d1.prepare(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT NOT NULL,
        display_name TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        owner_user_id TEXT NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS workspace_members (
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (workspace_id, user_id)
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        destination_url TEXT NOT NULL,
        slug TEXT NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        created_by_user_id TEXT NOT NULL REFERENCES users(id),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`),
      d1.prepare(`CREATE TABLE IF NOT EXISTS click_events (
        id TEXT PRIMARY KEY NOT NULL,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        referrer_host TEXT,
        device_class TEXT NOT NULL,
        occurred_at INTEGER NOT NULL
      )`),
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id)"),
      d1.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_links_slug ON links(slug)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_updated ON links(workspace_id, updated_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_links_workspace_status ON links(workspace_id, status)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_click_events_workspace_time ON click_events(workspace_id, occurred_at)"),
      d1.prepare("CREATE INDEX IF NOT EXISTS idx_click_events_link_time ON click_events(link_id, occurred_at)"),
      d1.prepare("PRAGMA optimize"),
    ]);
  })();
  return schemaReady;
}

export async function ensureUser(user: ChatGPTUser): Promise<void> {
  await ensureSchema();
  const now = Date.now();
  await database().prepare(`
    INSERT INTO users (id, email, display_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      display_name = excluded.display_name,
      updated_at = excluded.updated_at
  `).bind(user.userId, user.email, user.fullName ?? user.displayName, now, now).run();
}

export async function listWorkspaces(userId: string): Promise<WorkspaceRow[]> {
  await ensureSchema();
  const result = await database().prepare(`
    SELECT w.id, w.name, w.slug, wm.role
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = ?
    ORDER BY w.created_at ASC
  `).bind(userId).all<WorkspaceRow>();
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
    d1.prepare(`INSERT INTO workspaces (id, name, slug, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, name, slug, user.userId, now, now),
    d1.prepare(`INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)`)
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
  const row = await database().prepare(`
    SELECT w.id, w.name, w.slug, wm.role
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE w.id = ? AND wm.user_id = ?
    LIMIT 1
  `).bind(workspaceId, userId).first<WorkspaceRow>();
  if (!row) throw new Error("WORKSPACE_FORBIDDEN");
  return row;
}

function canWrite(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin" || role === "editor";
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export async function listLinks(
  userId: string,
  workspaceId: string,
  options: { query?: string; status?: "all" | "active" | "archived" } = {},
): Promise<LinkRow[]> {
  await requireWorkspace(userId, workspaceId);
  const query = options.query?.trim().toLocaleLowerCase("pt-BR").slice(0, 100) ?? "";
  const pattern = `%${escapeLike(query)}%`;
  const status = options.status ?? "all";
  const result = await database().prepare(`
    SELECT l.id, l.workspace_id, l.title, l.destination_url, l.slug, l.status,
           l.created_at, l.updated_at, COUNT(ce.id) AS clicks
    FROM links l
    LEFT JOIN click_events ce ON ce.link_id = l.id
    WHERE l.workspace_id = ?
      AND (? = '' OR LOWER(l.title) LIKE ? ESCAPE '\\' OR LOWER(l.slug) LIKE ? ESCAPE '\\' OR LOWER(l.destination_url) LIKE ? ESCAPE '\\')
      AND (? = 'all' OR l.status = ?)
    GROUP BY l.id
    ORDER BY l.updated_at DESC
    LIMIT 100
  `).bind(workspaceId, query, pattern, pattern, pattern, status, status).all<LinkRow>();
  return result.results.map((row) => ({ ...row, clicks: Number(row.clicks) }));
}

export async function createLink(input: {
  userId: string;
  workspaceId: string;
  title: string;
  destinationUrl: string;
  slug?: string;
}): Promise<LinkRow> {
  await requireWorkspace(input.userId, input.workspaceId);
  const destinationUrl = validateDestination(input.destinationUrl);
  const title = input.title.trim().slice(0, 100);
  if (!title) throw new Error("Dê um nome ao link.");
  const slug = normalizeSlug(input.slug?.trim() || title);
  if (slug.length < 3 || slug.length > 48) throw new Error("O slug deve ter entre 3 e 48 caracteres.");
  const id = crypto.randomUUID();
  const now = Date.now();
  try {
    await database().prepare(`
      INSERT INTO links (id, workspace_id, title, destination_url, slug, status, created_by_user_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).bind(id, input.workspaceId, title, destinationUrl, slug, input.userId, now, now).run();
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("Este slug já está em uso.");
    throw error;
  }
  return {
    id,
    workspace_id: input.workspaceId,
    title,
    destination_url: destinationUrl,
    slug,
    status: "active",
    created_at: now,
    updated_at: now,
    clicks: 0,
  };
}

async function linkForMember(userId: string, linkId: string): Promise<LinkRow & { role: WorkspaceRole }> {
  await ensureSchema();
  const row = await database().prepare(`
    SELECT l.id, l.workspace_id, l.title, l.destination_url, l.slug, l.status,
           l.created_at, l.updated_at, wm.role,
           (SELECT COUNT(*) FROM click_events ce WHERE ce.link_id = l.id) AS clicks
    FROM links l
    JOIN workspace_members wm ON wm.workspace_id = l.workspace_id
    WHERE l.id = ? AND wm.user_id = ?
    LIMIT 1
  `).bind(linkId, userId).first<LinkRow & { role: WorkspaceRole }>();
  if (!row) throw new Error("LINK_NOT_FOUND");
  return { ...row, clicks: Number(row.clicks) };
}

export async function updateLink(input: {
  userId: string;
  linkId: string;
  title?: string;
  destinationUrl?: string;
  slug?: string;
  status?: "active" | "archived";
  expectedUpdatedAt: number;
}): Promise<LinkRow> {
  const existing = await linkForMember(input.userId, input.linkId);
  if (!canWrite(existing.role)) throw new Error("WORKSPACE_READ_ONLY");

  const title = input.title === undefined ? existing.title : input.title.trim().slice(0, 100);
  if (!title) throw new Error("Dê um nome ao link.");
  const destinationUrl = input.destinationUrl === undefined
    ? existing.destination_url
    : validateDestination(input.destinationUrl);
  const slug = input.slug === undefined ? existing.slug : normalizeSlug(input.slug.trim());
  if (slug.length < 3 || slug.length > 48) throw new Error("O slug deve ter entre 3 e 48 caracteres.");
  const status = input.status ?? existing.status;
  if (status === "blocked") throw new Error("Links bloqueados exigem revisão interna.");
  const expectedUpdatedAt = input.expectedUpdatedAt;
  const now = Math.max(Date.now(), expectedUpdatedAt + 1);

  try {
    const result = await database().prepare(`
      UPDATE links
      SET title = ?, destination_url = ?, slug = ?, status = ?, updated_at = ?
      WHERE id = ? AND workspace_id = ? AND updated_at = ?
    `).bind(title, destinationUrl, slug, status, now, existing.id, existing.workspace_id, expectedUpdatedAt).run();
    if (!result.meta.changes) throw new Error("LINK_CONFLICT");
  } catch (error) {
    const message = String(error).toLowerCase();
    if (message.includes("unique")) throw new Error("Este slug já está em uso.");
    throw error;
  }

  const updated = await linkForMember(input.userId, input.linkId);
  const { role: _role, ...link } = updated;
  void _role;
  return link;
}

export async function workspaceSummary(userId: string, workspaceId: string) {
  await requireWorkspace(userId, workspaceId);
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const [linksRow, clicksRow, devicesResult] = await Promise.all([
    database().prepare(`SELECT COUNT(*) AS total FROM links WHERE workspace_id = ? AND status = 'active'`).bind(workspaceId).first<{ total: number }>(),
    database().prepare(`SELECT COUNT(*) AS total FROM click_events WHERE workspace_id = ? AND occurred_at >= ?`).bind(workspaceId, since).first<{ total: number }>(),
    database().prepare(`
      SELECT device_class, COUNT(*) AS total
      FROM click_events
      WHERE workspace_id = ? AND occurred_at >= ?
      GROUP BY device_class
      ORDER BY total DESC
    `).bind(workspaceId, since).all<{ device_class: string; total: number }>(),
  ]);
  return {
    activeLinks: Number(linksRow?.total ?? 0),
    clicks7d: Number(clicksRow?.total ?? 0),
    devices: devicesResult.results.map((row) => ({ name: row.device_class, value: Number(row.total) })),
  };
}
