import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#182019" }}>
      <div style={{ position: "relative", width: 310, height: 210, display: "flex" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 210, height: 210, border: "28px solid #c7f36b", borderRadius: 999 }} />
        <div style={{ position: "absolute", right: 0, top: 0, width: 210, height: 210, border: "28px solid #f3f1eb", borderRadius: 999 }} />
      </div>
    </div>,
    { width: 512, height: 512, headers: { "cache-control": "public, max-age=86400, immutable" } },
  );
}
