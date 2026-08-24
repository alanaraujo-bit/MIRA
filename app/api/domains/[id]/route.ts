import { getChatGPTUser } from "../../../chatgpt-auth";
import { deleteDomain } from "../../../../db/repository";
import { apiError, errorResponse, writeRequestGuard } from "../../response";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = writeRequestGuard(request);
  if (guard) return guard;
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const { id } = await context.params;
    await deleteDomain(user.userId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
