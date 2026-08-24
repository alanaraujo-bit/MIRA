import { getChatGPTUser } from "../../chatgpt-auth";
import { listTags } from "../../../db/repository";
import { apiError, errorResponse } from "../response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return apiError("Workspace obrigatório.");
  try {
    return Response.json({ tags: await listTags(user.userId, workspaceId) });
  } catch (error) {
    return errorResponse(error);
  }
}
