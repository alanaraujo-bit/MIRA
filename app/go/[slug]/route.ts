import { database, ensurePlatformSchema } from "../../../db/postgres";
import { recordClick, resolveLink } from "../../../db/data-plane";
import { resolveSessionTracking } from "../../../lib/session-tracking";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const startedAt = performance.now();
  const { slug } = await context.params;
  if (!/^[a-z0-9-]{3,48}$/i.test(slug)) return unavailable();
  await ensurePlatformSchema();
  const link = await resolveLink(database(), slug);
  if (!link || link.status !== "active") return unavailable();
  const eventId = crypto.randomUUID();
  const session = resolveSessionTracking(request.headers, link.workspace_id, process.env.NODE_ENV === "production");
  try {
    await recordClick(database(), { eventId, linkId: link.id, workspaceId: link.workspace_id,
      referrer: request.headers.get("referer"), userAgent: request.headers.get("user-agent"), sessionIdHash: session.sessionIdHash });
  } catch (error) {
    console.error("click_ingest_failed", { eventId, linkId: link.id, error: error instanceof Error ? error.message : "unknown" });
  }
  const headers = new Headers({ location: link.destination_url, "cache-control": "private, no-store, max-age=0",
    "server-timing": `resolve;dur=${(performance.now() - startedAt).toFixed(1)}`, "x-mira-request-id": eventId,
    "referrer-policy": "strict-origin-when-cross-origin", "x-content-type-options": "nosniff" });
  if (session.setCookie) headers.set("set-cookie", session.setCookie);
  return new Response(null, { status: 302, headers });
}

function unavailable() {
  return new Response("Link indisponível", { status: 404, headers: { "content-type": "text/plain; charset=utf-8",
    "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" } });
}
