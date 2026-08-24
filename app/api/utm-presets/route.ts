import { getChatGPTUser } from "../../chatgpt-auth";
import { createUtmPreset, listUtmPresets } from "../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return apiError("Workspace obrigatório.");
  try {
    return Response.json({ presets: await listUtmPresets(user.userId, workspaceId) });
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
    const body = await request.json() as { workspaceId?: string; name?: string;
      utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string } };
    if (!body.workspaceId || !body.name || !body.utm) return apiError("Workspace, nome e parâmetros UTM são obrigatórios.");
    return Response.json({ preset: await createUtmPreset({ userId: user.userId, workspaceId: body.workspaceId,
      name: body.name, utm: body.utm }) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
