import { getChatGPTUser } from "../../chatgpt-auth";
import { ensureDefaultWorkspace, listWorkspaces } from "../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = writeRequestGuard(request);
  if (guard) return guard;
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const selected = await ensureDefaultWorkspace(user);
    const workspaces = await listWorkspaces(user.userId);
    return Response.json({ user, selected, workspaces });
  } catch (error) {
    return errorResponse(error);
  }
}
