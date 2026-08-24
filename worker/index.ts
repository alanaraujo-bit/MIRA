/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { recordClick, resolveBrandedLink, resolveLink, type ResolvedLink } from "../db/data-plane";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/go/")) {
      const startedAt = performance.now();
      const encodedSlug = url.pathname.slice(4);
      let slug: string;
      try {
        slug = decodeURIComponent(encodedSlug);
      } catch {
        return unavailableLink();
      }
      if (!slug || slug.includes("/")) return unavailableLink();

      const link = await resolveLink(env.DB, slug);
      if (!link || link.status !== "active") return unavailableLink();
      return trackedRedirect(request, env.DB, ctx, link, startedAt);
    }

    const brandedMatch = url.pathname.match(/^\/([^/]+)\/?$/);
    if (brandedMatch) {
      let slug: string;
      try { slug = decodeURIComponent(brandedMatch[1]); } catch { slug = ""; }
      if (slug) {
        const startedAt = performance.now();
        const link = await resolveBrandedLink(env.DB, url.hostname, slug);
        if (link?.status === "active") return trackedRedirect(request, env.DB, ctx, link, startedAt);
      }
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return secureResponse(await handler.fetch(request, env, ctx));
  },
};

function trackedRedirect(request: Request, database: D1Database, ctx: ExecutionContext, link: ResolvedLink, startedAt: number): Response {
  const eventId = crypto.randomUUID();
  ctx.waitUntil(recordClick(database, {
    eventId,
    linkId: link.id,
    workspaceId: link.workspace_id,
    referrer: request.headers.get("referer"),
    userAgent: request.headers.get("user-agent"),
  }).catch(() => {
    console.error("click_ingest_failed", { eventId, linkId: link.id });
  }));
  return new Response(null, { status: 302, headers: {
    location: link.destination_url,
    "cache-control": "private, no-store, max-age=0",
    "server-timing": `resolve;dur=${(performance.now() - startedAt).toFixed(1)}`,
    "x-mira-request-id": eventId,
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
  } });
}

function unavailableLink(): Response {
  return new Response("Link indisponível", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "private, no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

function secureResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("content-security-policy", "frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
  if (!headers.has("x-mira-request-id")) headers.set("x-mira-request-id", crypto.randomUUID());
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default worker;
