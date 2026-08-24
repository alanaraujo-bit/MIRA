import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { ensurePlatformSchema, rawQuery } from "../db/postgres";
import { normalizeEmail, validatePassword } from "../lib/auth-rules";
import { tokenHash, type ChatGPTUser } from "./chatgpt-auth";

const SESSION_TTL = 30 * 24 * 60 * 60 * 1000;

async function incrementRateLimit(key: string, windowMs: number, limit: number, now: number): Promise<void> {
  const rows = await rawQuery<{ attempts: number }>(`INSERT INTO auth_rate_limits (key, attempts, window_started_at, updated_at)
    VALUES (?, 1, ?, ?) ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN auth_rate_limits.window_started_at < ? THEN 1 ELSE auth_rate_limits.attempts + 1 END,
    window_started_at = CASE WHEN auth_rate_limits.window_started_at < ? THEN ? ELSE auth_rate_limits.window_started_at END,
    updated_at = ? RETURNING attempts`, [key, now, now, now - windowMs, now - windowMs, now, now]);
  if (Number(rows[0]?.attempts ?? 1) > limit) throw new Error("AUTH_RATE_LIMIT");
}

export async function enforceAuthRateLimit(action: "login" | "register", ip: string, accountHint: string): Promise<void> {
  await ensurePlatformSchema();
  const now = Date.now();
  const windowMs = action === "login" ? 15 * 60_000 : 60 * 60_000;
  const normalizedIp = ip || "unknown";
  const normalizedAccount = accountHint.trim().toLowerCase().slice(0, 254) || "unknown";
  await incrementRateLimit(tokenHash(`${action}:account:${normalizedIp}:${normalizedAccount}`), windowMs, action === "login" ? 10 : 5, now);
  await incrementRateLimit(tokenHash(`${action}:network:${normalizedIp}`), windowMs, action === "login" ? 60 : 30, now);
}

export async function registerAccount(input: { email: string; password: string; name: string }): Promise<{ user: ChatGPTUser; token: string }> {
  await ensurePlatformSchema();
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);
  const name = input.name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (name.length < 2) throw new Error("Informe seu nome.");
  const id = crypto.randomUUID();
  const now = Date.now();
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await rawQuery("INSERT INTO users (id, email, display_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, email, name, passwordHash, now, now]);
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) throw new Error("Já existe uma conta com este e-mail.");
    throw error;
  }
  const token = await createSession(id);
  return { user: { userId: id, email, displayName: name, fullName: name }, token };
}

export async function loginAccount(input: { email: string; password: string }): Promise<{ user: ChatGPTUser; token: string }> {
  await ensurePlatformSchema();
  const email = normalizeEmail(input.email);
  const rows = await rawQuery<{ id: string; email: string; display_name: string | null; password_hash: string | null }>(
    "SELECT id, email, display_name, password_hash FROM users WHERE LOWER(email) = ? LIMIT 1", [email]);
  const row = rows[0];
  if (!row?.password_hash || !(await bcrypt.compare(input.password, row.password_hash))) throw new Error("E-mail ou senha incorretos.");
  const token = await createSession(row.id);
  const displayName = row.display_name || row.email.split("@")[0];
  return { user: { userId: row.id, email: row.email, displayName, fullName: row.display_name }, token };
}

async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const now = Date.now();
  await rawQuery("INSERT INTO user_sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [tokenHash(token), userId, now + SESSION_TTL, now]);
  return token;
}

export async function revokeSession(token: string | undefined): Promise<void> {
  if (token) await rawQuery("DELETE FROM user_sessions WHERE id = ?", [tokenHash(token)]);
}

export const sessionMaxAgeSeconds = SESSION_TTL / 1000;
