export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
  if (message === "WORKSPACE_FORBIDDEN") return apiError("Workspace não encontrado ou acesso negado.", 403);
  return apiError(message, 400);
}
