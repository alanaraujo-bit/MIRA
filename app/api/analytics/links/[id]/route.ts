import { getChatGPTUser } from "../../../../chatgpt-auth";
import { linkAnalytics } from "../../../../../db/analytics";
import { apiError, errorResponse } from "../../../response";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  const days = Number(new URL(request.url).searchParams.get("days") ?? 7);
  if (![7, 30, 90].includes(days)) return apiError("Período analítico inválido.");
  try {
    const { id } = await context.params;
    return Response.json({ analytics: await linkAnalytics(user.userId, id, days) });
  } catch (error) {
    return errorResponse(error);
  }
}
