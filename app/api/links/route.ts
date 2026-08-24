import { getChatGPTUser } from "../../chatgpt-auth";
import { createLink, listLinks } from "../../../db/repository";
import { apiError, errorResponse } from "../response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return apiError("Workspace obrigatório.");
  try {
    return Response.json({ links: await listLinks(user.userId, workspaceId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const body = await request.json() as {
      workspaceId?: string;
      title?: string;
      destinationUrl?: string;
      slug?: string;
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
    });
    return Response.json({ link }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
