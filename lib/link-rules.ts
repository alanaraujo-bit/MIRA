function safeStem(value: string, fallback: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return normalized || fallback;
}

export function normalizeSlug(value: string): string {
  return safeStem(value, `link-${crypto.randomUUID().slice(0, 6)}`);
}

export function normalizeTag(value: string): { name: string; normalizedName: string } | null {
  const name = value.trim().replace(/\s+/g, " ").slice(0, 32);
  if (!name) return null;
  return { name, normalizedName: safeStem(name, "tag") };
}

export type UtmFields = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
  term?: string | null;
};

export function normalizeUtmValue(value: string | null | undefined): string | null {
  const normalized = value
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._~-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return normalized || null;
}

export function applyUtmParameters(destination: string, fields: UtmFields): string {
  const validated = validateDestination(destination);
  const url = new URL(validated);
  const values = {
    utm_source: fields.source,
    utm_medium: fields.medium,
    utm_campaign: fields.campaign,
    utm_content: fields.content,
    utm_term: fields.term,
  };
  for (const [key, raw] of Object.entries(values)) {
    const value = normalizeUtmValue(raw);
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  return url.toString();
}

function isUnsafeHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "0.0.0.0" || host === "::" || host === "::1") return true;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!match) return false;
  const octets = match.slice(1).map(Number);
  if (octets.some((part) => part > 255)) return true;
  return octets[0] === 10 || octets[0] === 127 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168);
}

export function validateDestination(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Informe uma URL completa e válida.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Apenas destinos HTTP ou HTTPS são aceitos.");
  }
  if (url.username || url.password) {
    throw new Error("URLs com credenciais embutidas não são aceitas.");
  }
  if (isUnsafeHostname(url.hostname)) {
    throw new Error("Destinos locais ou de rede privada não são aceitos.");
  }
  return url.toString();
}

export function classifyDevice(userAgent: string | null): "mobile" | "desktop" | "bot" | "unknown" {
  if (!userAgent) return "unknown";
  if (/bot|crawler|spider|preview|facebookexternalhit|slackbot/i.test(userAgent)) return "bot";
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function referrerHost(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.slice(0, 255);
  } catch {
    return null;
  }
}
