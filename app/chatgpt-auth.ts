import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensurePlatformSchema, rawQuery } from "../db/postgres";

export type ChatGPTUser = { userId: string; displayName: string; email: string; fullName: string | null };
export const SESSION_COOKIE = "mira_session";

export function tokenHash(value: string): string { return createHash("sha256").update(value).digest("hex"); }

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await ensurePlatformSchema();
  const rows = await rawQuery<{ id: string; email: string; display_name: string | null }>(`SELECT u.id, u.email, u.display_name
    FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > ? LIMIT 1`, [tokenHash(token), Date.now()]);
  const user = rows[0];
  if (!user) return null;
  const displayName = user.display_name?.trim() || user.email.split("@")[0];
  return { userId: user.id, displayName, email: user.email, fullName: user.display_name };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(`/login?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}

export function safeRelativeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/product";
  try {
    const url = new URL(value, "https://mira.local");
    if (url.origin !== "https://mira.local" || url.pathname.startsWith("/api/auth")) return "/product";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/product"; }
}
