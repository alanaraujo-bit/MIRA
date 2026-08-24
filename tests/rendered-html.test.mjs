import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Mira Roadmap Live", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Mira — Roadmap Live<\/title>/i);
  assert.match(html, /Infraestrutura programável para cada link\./);
  assert.match(html, /Roadmap Live/);
  assert.match(html, /Abrir produto/);
  assert.match(html, /Milestone 2/);
  assert.match(html, /Campaigns, canais, tags, UTMs e QR/);
  assert.match(html, /Critério de saída/);
  assert.match(html, /Abrir release/);
  assert.match(html, /mira-link-intelligence\.alanvitoraraujo1a\.chatgpt\.site/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships product metadata, PWA files and truthful status language", async () => {
  const [page, product, campaigns, repository, dataPlane, worker, patchRoute, responseHelpers, iconRoute, offlinePage, migration, m2Migration, layout, data, manifest, serviceWorker, social] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product/product-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/product/campaigns/campaigns-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/repository.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/data-plane.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/links/[id]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/response.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/icon/route.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/offline/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_gorgeous_shen.sql", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_tan_prowler.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/roadmap-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.match(page, /role="progressbar"/);
  assert.match(page, /aria-label="Filtrar por status"/);
  assert.match(page, /serviceWorker/);
  assert.match(product, /Nenhum dado de demonstração/);
  assert.match(product, /\/api\/bootstrap/);
  assert.match(product, /Buscar por nome, slug ou destino/);
  assert.match(product, /Arquivar/);
  assert.match(product, /Organização e UTMs/);
  assert.match(product, /\/qr\?download=1/);
  assert.match(campaigns, /Uma campanha\. Todos os canais\./);
  assert.match(repository, /WORKSPACE_FORBIDDEN/);
  assert.match(repository, /LINK_CONFLICT/);
  assert.match(dataPlane, /INSERT OR IGNORE INTO click_events/);
  assert.match(worker, /ctx\.waitUntil\(recordClick/);
  assert.match(worker, /server-timing/);
  assert.match(worker, /content-security-policy/);
  assert.match(patchRoute, /export async function PATCH/);
  assert.match(responseHelpers, /sec-fetch-site/);
  assert.match(responseHelpers, /application\/json/);
  assert.match(iconRoute, /ImageResponse/);
  assert.match(offlinePage, /Seus links continuam no ar/);
  assert.match(migration, /CREATE TABLE `workspace_members`/);
  assert.match(migration, /CREATE UNIQUE INDEX `idx_links_slug`/);
  assert.match(m2Migration, /CREATE TABLE `campaigns`/);
  assert.match(m2Migration, /CREATE TABLE `tags`/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /summary_large_image/);
  assert.match(data, /Inspeção visual indisponível/);
  assert.match(data, /task\("Validar desktop, mobile e PWA"[^\n]+"blocked"/);
  const parsedManifest = JSON.parse(manifest);
  assert.equal(parsedManifest.display, "standalone");
  assert.equal(parsedManifest.start_url, "/product");
  assert.equal(parsedManifest.icons[0].type, "image/png");
  assert.match(serviceWorker, /caches\.open/);
  assert.match(serviceWorker, /isSensitive/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.equal(social, undefined);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
