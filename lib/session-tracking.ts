import { createHash, randomUUID } from "node:crypto";

export const TRACKING_SESSION_COOKIE = "mira_sid";
export const TRACKING_SESSION_SECONDS = 30 * 60;

type SessionTracking = {
  sessionIdHash: string | null;
  setCookie: string | null;
  optedOut: boolean;
};

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

function validSessionToken(value: string | null): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export function resolveSessionTracking(headers: Headers, workspaceId: string, secure: boolean): SessionTracking {
  const optedOut = headers.get("sec-gpc") === "1" || headers.get("dnt") === "1";
  if (optedOut) {
    const attributes = [`${TRACKING_SESSION_COOKIE}=`, "Path=/", "Max-Age=0", "HttpOnly", "SameSite=Lax", "Priority=Medium"];
    if (secure) attributes.push("Secure");
    return { sessionIdHash: null, setCookie: attributes.join("; "), optedOut: true };
  }
  const existing = cookieValue(headers.get("cookie"), TRACKING_SESSION_COOKIE);
  const token = validSessionToken(existing) ? existing : randomUUID();
  const sessionIdHash = createHash("sha256").update(`${workspaceId}:${token}`).digest("hex");
  const attributes = [`${TRACKING_SESSION_COOKIE}=${encodeURIComponent(token)}`, "Path=/", `Max-Age=${TRACKING_SESSION_SECONDS}`,
    "HttpOnly", "SameSite=Lax", "Priority=Medium"];
  if (secure) attributes.push("Secure");
  return { sessionIdHash, setCookie: attributes.join("; "), optedOut: false };
}
