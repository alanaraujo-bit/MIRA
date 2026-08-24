import assert from "node:assert/strict";

const baseUrl = process.env.MIRA_BASE_URL || "http://localhost:3000";
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function client() {
  let cookie = "";
  return { async request(path, init = {}, expectedStatus = 200) {
    const headers = { ...(init.headers || {}) };
    if (cookie) headers.cookie = cookie;
    const response = await fetch(`${baseUrl}${path}`, { ...init, headers, redirect: init.redirect ?? "manual" });
    assert.equal(response.status, expectedStatus, `${init.method || "GET"} ${path} should return ${expectedStatus}`);
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";", 1)[0];
    return response;
  } };
}

const owner = client();
const outsider = client();
const jsonHeaders = { "content-type": "application/json" };
const email = `owner-${runId}@mira.test`;
await owner.request("/api/auth/register", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "Mira Owner", email, password: "mira-segura-2026" }) }, 201);
await owner.request("/api/auth/register", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "Duplicado", email, password: "mira-segura-2026" }) }, 400);
await outsider.request("/api/auth/register", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ name: "Outra Pessoa", email: `other-${runId}@mira.test`, password: "outra-segura-2026" }) }, 201);

const product = await owner.request("/product", { headers: { accept: "text/html" } });
assert.match(await product.text(), /Preparando seu Workspace/);
const bootstrap = await owner.request("/api/bootstrap", { method: "POST", headers: jsonHeaders, body: "{}" });
const workspace = (await bootstrap.json()).selected;
assert.equal(workspace.role, "owner");

const campaignResponse = await owner.request("/api/campaigns", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ workspaceId: workspace.id, name: "Public launch", objective: "Validate Vercel flow" }) }, 201);
const campaign = (await campaignResponse.json()).campaign;
const slug = `public-${runId}`;
const linkResponse = await owner.request("/api/links", { method: "POST", headers: jsonHeaders, body: JSON.stringify({
  workspaceId: workspace.id, title: "Public smoke", destinationUrl: "https://example.com/mira-public", slug,
  campaignId: campaign.id, channel: "Mobile", tags: ["Publicação"], utm: { source: "qr", medium: "offline", campaign: "public-launch" },
}) }, 201);
const link = (await linkResponse.json()).link;
assert.equal(link.campaign_id, campaign.id);
await outsider.request(`/api/links?workspaceId=${workspace.id}`, {}, 403);
await outsider.request(`/api/links/${link.id}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify({ title: "Nope", expectedUpdatedAt: link.updated_at }) }, 404);

const redirect = await fetch(`${baseUrl}/go/${slug}`, { redirect: "manual", headers: { referer: "https://instagram.com/story", "user-agent": "Mozilla/5.0 (iPhone) Mobile" } });
assert.equal(redirect.status, 302);
assert.match(redirect.headers.get("location") || "", /utm_source=qr/);
assert.match(redirect.headers.get("x-mira-request-id") || "", /^[0-9a-f-]{36}$/);
const summary = await owner.request(`/api/analytics/summary?workspaceId=${workspace.id}`);
assert.equal((await summary.json()).summary.clicks7d, 1);
const qr = await owner.request(`/api/links/${link.id}/qr?download=1`);
assert.match(qr.headers.get("content-type") || "", /^image\/svg\+xml/);

const domainResponse = await owner.request("/api/domains", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ workspaceId: workspace.id, hostname: `go-${runId}.example.com` }) }, 201);
const domain = (await domainResponse.json()).domain;
const verification = await owner.request(`/api/domains/${domain.id}/verify`, { method: "POST", headers: jsonHeaders, body: "{}" });
assert.ok(["mismatch", "unreachable"].includes((await verification.json()).domain.dns_status));

await owner.request("/api/auth/logout", { method: "POST", headers: jsonHeaders, body: "{}" }, 204);
await owner.request("/product", { headers: { accept: "text/html" } }, 307);
await owner.request("/api/auth/login", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ email, password: "senha-errada-2026" }) }, 400);
await owner.request("/api/auth/login", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ email, password: "mira-segura-2026" }) });
await owner.request("/product", { headers: { accept: "text/html" } });

console.log(JSON.stringify({ account: email, workspace: workspace.id, campaign: campaign.id, link: link.id,
  redirect: 302, clickPersisted: true, qr: "svg", domainDns: "checked", isolation: { workspace: 403, link: 404 }, session: "restored" }, null, 2));
