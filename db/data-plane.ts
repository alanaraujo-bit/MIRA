import { classifyDevice, referrerHost } from "../lib/link-rules";

export type ResolvedLink = {
  id: string;
  workspace_id: string;
  destination_url: string;
  status: "active" | "archived" | "blocked";
};

export async function resolveLink(database: D1Database, slug: string): Promise<ResolvedLink | null> {
  return database.prepare(`
    SELECT id, workspace_id, destination_url, status
    FROM links
    WHERE slug = ?
    LIMIT 1
  `).bind(slug).first<ResolvedLink>();
}

export async function resolveBrandedLink(database: D1Database, hostname: string, slug: string): Promise<ResolvedLink | null> {
  return database.prepare(`
    SELECT l.id, l.workspace_id, l.destination_url, l.status
    FROM links l
    JOIN domains d ON d.id = l.domain_id
    WHERE d.hostname = ? AND d.status = 'active' AND l.slug = ?
    LIMIT 1
  `).bind(hostname.toLowerCase().replace(/\.$/, ""), slug).first<ResolvedLink>();
}

export async function recordClick(database: D1Database, input: {
  eventId: string;
  linkId: string;
  workspaceId: string;
  referrer: string | null;
  userAgent: string | null;
}): Promise<void> {
  await database.prepare(`
    INSERT OR IGNORE INTO click_events (id, workspace_id, link_id, referrer_host, device_class, occurred_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    input.eventId,
    input.workspaceId,
    input.linkId,
    referrerHost(input.referrer),
    classifyDevice(input.userAgent),
    Date.now(),
  ).run();
}
