import { recordClick, resolveLink } from "../../../db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const link = await resolveLink(slug);
  if (!link || link.status !== "active") {
    return new Response("Link indisponível", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }

  await recordClick({
    linkId: link.id,
    workspaceId: link.workspace_id,
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  });

  return Response.redirect(link.destination_url, 302);
}
