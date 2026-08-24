import { getChatGPTUser } from "../../../../chatgpt-auth";
import { setLinkFavorite } from "../../../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../../../response";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = writeRequestGuard(request);
  if (guard) return guard;
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const body = await request.json() as { favorite?: boolean };
    if (typeof body.favorite !== "boolean") return apiError("Estado de favorito inválido.");
    const { id } = await context.params;
    return Response.json({ link: await setLinkFavorite(user.userId, id, body.favorite) });
  } catch (error) {
    return errorResponse(error);
  }
}
