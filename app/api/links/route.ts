import { getChatGPTUser } from "../../chatgpt-auth";
import { createLink, listLinks } from "../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  const searchParams = new URL(request.url).searchParams;
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return apiError("Workspace obrigatório.");
  const query = searchParams.get("query") ?? "";
  const requestedStatus = searchParams.get("status") ?? "all";
  if (!new Set(["all", "active", "archived"]).has(requestedStatus)) return apiError("Status de filtro inválido.");
  try {
    return Response.json({
      links: await listLinks(user.userId, workspaceId, {
        query,
        status: requestedStatus as "all" | "active" | "archived",
        campaignId: searchParams.get("campaignId") ?? "",
        tag: searchParams.get("tag") ?? "",
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const guard = writeRequestGuard(request);
  if (guard) return guard;
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const body = await request.json() as {
      workspaceId?: string;
      title?: string;
      destinationUrl?: string;
      slug?: string;
      campaignId?: string | null;
      channel?: string | null;
      tags?: string[];
      utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
    };
    if (!body.workspaceId || !body.title || !body.destinationUrl) {
      return apiError("Workspace, nome e destino são obrigatórios.");
    }
    const link = await createLink({
      userId: user.userId,
      workspaceId: body.workspaceId,
      title: body.title,
      destinationUrl: body.destinationUrl,
      slug: body.slug,
      campaignId: body.campaignId,
      channel: body.channel,
      tags: Array.isArray(body.tags) ? body.tags : [],
      utm: body.utm,
    });
    return Response.json({ link }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
