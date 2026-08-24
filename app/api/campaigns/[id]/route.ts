import { getChatGPTUser } from "../../../chatgpt-auth";
import { getCampaignDetail, updateCampaign, type CampaignStatus } from "../../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../../response";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const { id } = await context.params;
    return Response.json({ campaign: await getCampaignDetail(user.userId, id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = writeRequestGuard(request);
  if (guard) return guard;
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const body = await request.json() as { name?: string; objective?: string | null; status?: CampaignStatus;
      startsAt?: number | null; endsAt?: number | null; expectedUpdatedAt?: number };
    if (body.status && !new Set(["planning", "active", "ended"]).has(body.status)) return apiError("Status de campanha inválido.");
    if (!Number.isSafeInteger(body.expectedUpdatedAt)) return apiError("Versão da campanha inválida.");
    const { id } = await context.params;
    const campaign = await updateCampaign({ userId: user.userId, campaignId: id, name: body.name,
      objective: body.objective, status: body.status, startsAt: body.startsAt, endsAt: body.endsAt,
      expectedUpdatedAt: body.expectedUpdatedAt! });
    return Response.json({ campaign });
  } catch (error) {
    return errorResponse(error);
  }
}
