import { getChatGPTUser } from "../../../chatgpt-auth";
import { workspaceAnalytics } from "../../../../db/analytics";
import { apiError, errorResponse } from "../../response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  const params = new URL(request.url).searchParams;
  const workspaceId = params.get("workspaceId");
  if (!workspaceId) return apiError("Workspace obrigatório.");
  const days = Number(params.get("days") ?? 7);
  if (![7, 30, 90].includes(days)) return apiError("Período analítico inválido.");
  try {
    return Response.json({ report: await workspaceAnalytics(user.userId, workspaceId, days) });
  } catch (error) {
    return errorResponse(error);
  }
}
