import { getChatGPTUser } from "../../chatgpt-auth";
import { createWorkspace, listWorkspaces } from "../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../response";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    return Response.json({ workspaces: await listWorkspaces(user.userId) });
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
    const body = await request.json() as { name?: string };
    if (!body.name?.trim()) return apiError("Informe o nome do Workspace.");
    return Response.json({ workspace: await createWorkspace(user, body.name) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
