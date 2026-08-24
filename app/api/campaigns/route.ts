import { getChatGPTUser } from "../../chatgpt-auth";
import { createCampaign, listCampaigns, type CampaignStatus } from "../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../response";

export const dynamic = "force-dynamic";
const statuses = new Set<CampaignStatus>(["planning", "active", "ended"]);

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return apiError("Workspace obrigatório.");
  try {
    return Response.json({ campaigns: await listCampaigns(user.userId, workspaceId) });
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
    const body = await request.json() as { workspaceId?: string; name?: string; objective?: string; status?: CampaignStatus; startsAt?: number | null; endsAt?: number | null };
    if (!body.workspaceId || !body.name) return apiError("Workspace e nome são obrigatórios.");
    if (body.status && !statuses.has(body.status)) return apiError("Status de campanha inválido.");
    const campaign = await createCampaign({ userId: user.userId, workspaceId: body.workspaceId, name: body.name,
      objective: body.objective, status: body.status, startsAt: body.startsAt, endsAt: body.endsAt });
    return Response.json({ campaign }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
