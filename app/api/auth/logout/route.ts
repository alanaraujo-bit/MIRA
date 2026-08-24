import { cookies } from "next/headers";
import { revokeSession } from "../../../auth-service";
import { SESSION_COOKIE } from "../../../chatgpt-auth";
import { writeRequestGuard } from "../../response";

export async function POST(request: Request) {
  const guard = writeRequestGuard(request); if (guard) return guard;
  const store = await cookies();
  await revokeSession(store.get(SESSION_COOKIE)?.value);
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return new Response(null, { status: 204 });
}
