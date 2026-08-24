import QRCode from "qrcode";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { getLinkForMember } from "../../../../../db/repository";
import { apiError, errorResponse } from "../../../response";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return apiError("Autenticação necessária.", 401);
  try {
    const { id } = await context.params;
    const link = await getLinkForMember(user.userId, id);
    const target = new URL(`/go/${link.slug}`, request.url).toString();
    const svg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "H", margin: 3,
      color: { dark: "#182019", light: "#F9F8F4" }, width: 640 });
    const headers = new Headers({ "content-type": "image/svg+xml; charset=utf-8", "cache-control": "private, no-store",
      "x-content-type-options": "nosniff" });
    if (new URL(request.url).searchParams.get("download") === "1") {
      headers.set("content-disposition", `attachment; filename="mira-${link.slug}-qr.svg"`);
    }
    return new Response(svg, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
