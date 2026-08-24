import { cookies } from "next/headers";
import { enforceAuthRateLimit, loginAccount, sessionMaxAgeSeconds } from "../../../auth-service";
import { SESSION_COOKIE, safeRelativeReturnPath } from "../../../chatgpt-auth";
import { errorResponse, writeRequestGuard } from "../../response";

export async function POST(request: Request) {
  const guard = writeRequestGuard(request); if (guard) return guard;
  try {
    const body = await request.json() as { email?: string; password?: string; returnTo?: string };
    await enforceAuthRateLimit("login", request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown", body.email ?? "");
    const result = await loginAccount({ email: body.email ?? "", password: body.password ?? "" });
    (await cookies()).set(SESSION_COOKIE, result.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionMaxAgeSeconds });
    return Response.json({ user: result.user, returnTo: safeRelativeReturnPath(body.returnTo) });
  } catch (error) { return errorResponse(error); }
}
