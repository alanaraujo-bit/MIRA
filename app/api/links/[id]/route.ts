import { getChatGPTUser } from "../../../chatgpt-auth";
import { updateLink } from "../../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../../response";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = writeRequestGuard(request);
  if (guard) return guard;
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const { id } = await context.params;
    const body = await request.json() as {
      title?: string;
      destinationUrl?: string;
      slug?: string;
      status?: "active" | "archived";
      expectedUpdatedAt?: number;
    };
    if (body.status && !new Set(["active", "archived"]).has(body.status)) {
      return apiError("Status de Link inválido.");
    }
    if (!Number.isSafeInteger(body.expectedUpdatedAt)) {
      return apiError("Versão do Link inválida.");
    }
    const link = await updateLink({
      userId: user.userId,
      linkId: id,
      title: body.title,
      destinationUrl: body.destinationUrl,
      slug: body.slug,
      status: body.status,
      expectedUpdatedAt: body.expectedUpdatedAt!,
    });
    return Response.json({ link });
  } catch (error) {
    return errorResponse(error);
  }
}
