export type DomainDnsResult = {
  status: "verified" | "mismatch" | "unreachable";
  checkedAt: number;
  observedValues: string[];
  error: string | null;
};

export function normalizeDomainHostname(input: string): string {
  const raw = input.trim().toLowerCase().replace(/\.$/, "");
  if (!raw || /[/:?#@]/.test(raw)) throw new Error("Informe apenas o domínio, sem protocolo ou caminho.");
  let hostname: string;
  try {
    hostname = new URL(`https://${raw}`).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    throw new Error("Informe um domínio válido.");
  }
  if (hostname.length > 253 || hostname === "localhost" || !hostname.includes(".")) {
    throw new Error("Informe um domínio público válido.");
  }
  const labels = hostname.split(".");
  if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
    throw new Error("O domínio contém um rótulo inválido.");
  }
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) throw new Error("Endereços IP não podem ser usados como domínio.");
  return hostname;
}

export function verificationRecordName(hostname: string): string {
  return `_mira-verification.${hostname}`;
}

function cleanTxtValue(value: string): string {
  return value.trim().replace(/^"|"$/g, "").replace(/"\s+"/g, "");
}

export function parseDnsTxtResponse(payload: unknown): { values: string[]; responseStatus: number | null } {
  if (!payload || typeof payload !== "object") return { values: [], responseStatus: null };
  const record = payload as { Status?: unknown; Answer?: unknown };
  const responseStatus = typeof record.Status === "number" ? record.Status : null;
  const answers = Array.isArray(record.Answer) ? record.Answer : [];
  const values = answers.flatMap((answer) => {
    if (!answer || typeof answer !== "object") return [];
    const typed = answer as { type?: unknown; data?: unknown };
    return typed.type === 16 && typeof typed.data === "string" ? [cleanTxtValue(typed.data)] : [];
  });
  return { values: [...new Set(values)], responseStatus };
}

export async function checkDomainDns(hostname: string, token: string, fetcher: typeof fetch = fetch): Promise<DomainDnsResult> {
  const checkedAt = Date.now();
  try {
    const endpoint = new URL("https://cloudflare-dns.com/dns-query");
    endpoint.searchParams.set("name", verificationRecordName(hostname));
    endpoint.searchParams.set("type", "TXT");
    const response = await fetcher(endpoint, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { status: "unreachable", checkedAt, observedValues: [], error: `Resolver DNS respondeu HTTP ${response.status}.` };
    const parsed = parseDnsTxtResponse(await response.json());
    if (parsed.responseStatus !== 0 && parsed.responseStatus !== 3) {
      return { status: "unreachable", checkedAt, observedValues: parsed.values, error: `Resolver DNS retornou código ${parsed.responseStatus ?? "inválido"}.` };
    }
    const expected = `mira-verification=${token}`;
    if (parsed.values.includes(expected)) return { status: "verified", checkedAt, observedValues: parsed.values, error: null };
    return { status: "mismatch", checkedAt, observedValues: parsed.values,
      error: parsed.values.length ? "O TXT existe, mas o valor não corresponde ao fornecido pela Mira." : "O registro TXT ainda não foi encontrado. A propagação DNS pode levar algum tempo." };
  } catch {
    return { status: "unreachable", checkedAt, observedValues: [], error: "Não foi possível consultar o resolver DNS agora. Tente novamente em instantes." };
  }
}
