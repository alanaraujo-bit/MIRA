import { getChatGPTUser } from "../../chatgpt-auth";
import { createDomain, listDomains } from "../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return apiError("Workspace obrigatório.");
  try {
    return Response.json({ domains: await listDomains(user.userId, workspaceId) });
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
    const body = await request.json() as { workspaceId?: string; hostname?: string };
    if (!body.workspaceId || !body.hostname) return apiError("Workspace e domínio são obrigatórios.");
    const domain = await createDomain({ userId: user.userId, workspaceId: body.workspaceId, hostname: body.hostname });
    return Response.json({ domain }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
