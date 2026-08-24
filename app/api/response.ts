export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function writeRequestGuard(request: Request): Response | null {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "application/json") return apiError("Envie o corpo como application/json.", 415);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 16_384) return apiError("Corpo da requisição muito grande.", 413);

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return apiError("Contexto de requisição não permitido.", 403);

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return apiError("Origem não permitida.", 403);
    } catch {
      return apiError("Origem inválida.", 403);
    }
  }
  return null;
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
  if (message === "WORKSPACE_FORBIDDEN") return apiError("Workspace não encontrado ou acesso negado.", 403);
  if (message === "WORKSPACE_READ_ONLY") return apiError("Seu papel neste Workspace não permite alterações.", 403);
  if (message === "LINK_NOT_FOUND") return apiError("Link não encontrado.", 404);
  if (message === "LINK_CONFLICT") return apiError("Este link foi alterado em outra sessão. Atualize os dados e tente novamente.", 409);
  if (message === "CAMPAIGN_NOT_FOUND") return apiError("Campanha não encontrada.", 404);
  if (message === "CAMPAIGN_CONFLICT") return apiError("Esta campanha foi alterada em outra sessão. Atualize os dados e tente novamente.", 409);
  if (message === "CURSOR_INVALID") return apiError("Cursor de paginação inválido.");
  if (message === "UTM_PRESET_NOT_FOUND") return apiError("Padrão UTM não encontrado.", 404);
  return apiError(message, 400);
}
