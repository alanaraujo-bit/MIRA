import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getDomainForMember, recordDomainDnsCheck } from "../../../../../db/repository";
import { checkDomainDns } from "../../../../../lib/domain-verification";
import { apiError, errorResponse, writeRequestGuard } from "../../../response";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guard = writeRequestGuard(request);
  if (guard) return guard;
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const { id } = await context.params;
    const { domain } = await getDomainForMember(user.userId, id);
    const result = await checkDomainDns(domain.hostname, domain.verification_token);
    const updated = await recordDomainDnsCheck(user.userId, id, result);
    return Response.json({ domain: updated, observedValues: result.observedValues });
  } catch (error) {
    return errorResponse(error);
  }
}
