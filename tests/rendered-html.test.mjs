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
  assert.match(html, /Aplicação em construção/);
  assert.match(html, /Milestone 0/);
  assert.match(html, /Critério de saída/);
  assert.match(html, /Abrir release/);
  assert.match(html, /mira-link-intelligence\.alanvitoraraujo1a\.chatgpt\.site/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("ships product metadata, PWA files and truthful status language", async () => {
  const [page, layout, data, manifest, serviceWorker, social] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/roadmap-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.match(page, /role="progressbar"/);
  assert.match(page, /aria-label="Filtrar por status"/);
  assert.match(page, /serviceWorker/);
  assert.match(layout, /openGraph/);
  assert.match(layout, /summary_large_image/);
  assert.match(data, /Inspeção visual indisponível/);
  assert.match(data, /task\("Validar desktop, mobile e PWA"[^\n]+"blocked"/);
  assert.equal(JSON.parse(manifest).display, "standalone");
  assert.match(serviceWorker, /caches\.open/);
  assert.equal(social, undefined);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
