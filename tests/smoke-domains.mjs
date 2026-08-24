import assert from "node:assert/strict";

const baseUrl = process.env.MIRA_BASE_URL || "http://localhost:3000";
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const headers = { "content-type": "application/json", "oai-authenticated-user-id": `domain-owner-${runId}`,
  "oai-authenticated-user-email": `domain-${runId}@mira.test` };
const outsider = { ...headers, "oai-authenticated-user-id": `domain-outsider-${runId}`,
  "oai-authenticated-user-email": `domain-outsider-${runId}@mira.test` };

async function request(path, init = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, init);
  assert.equal(response.status, expectedStatus, `${init.method || "GET"} ${path} should return ${expectedStatus}`);
  return response;
}

const boot = await request("/api/bootstrap", { method: "POST", headers, body: "{}" });
const workspace = (await boot.json()).selected;
const page = await request("/product/domains", { headers: { ...headers, accept: "text/html" } });
assert.match(await page.text(), /Lendo a configuração DNS/);

await request("/api/domains", { method: "POST", headers, body: JSON.stringify({ workspaceId: workspace.id, hostname: "https://invalid.example/path" }) }, 400);
const hostname = `go-${runId}.example.com`;
const createdResponse = await request("/api/domains", { method: "POST", headers, body: JSON.stringify({ workspaceId: workspace.id, hostname }) }, 201);
const domain = (await createdResponse.json()).domain;
assert.equal(domain.hostname, hostname);
assert.equal(domain.dns_status, "pending");
assert.match(domain.verification_token, /^[a-f0-9]{32}$/);

const slug = `branded-${runId}`;
const linkResponse = await request("/api/links", { method: "POST", headers, body: JSON.stringify({
  workspaceId: workspace.id, title: "Branded staging", destinationUrl: "https://example.com/branded", slug, domainId: domain.id,
}) }, 201);
const link = (await linkResponse.json()).link;
assert.equal(link.domain_id, domain.id);
assert.equal(link.domain_hostname, hostname);

await request("/api/domains", { method: "POST", headers, body: JSON.stringify({ workspaceId: workspace.id, hostname }) }, 400);
await request(`/api/domains/${domain.id}/verify`, { method: "POST", headers: outsider, body: "{}" }, 404);
const verificationResponse = await request(`/api/domains/${domain.id}/verify`, { method: "POST", headers, body: "{}" });
const checked = (await verificationResponse.json()).domain;
assert.ok(["mismatch", "unreachable"].includes(checked.dns_status));
assert.ok(checked.last_checked_at);

const listResponse = await request(`/api/domains?workspaceId=${workspace.id}`, { headers });
assert.equal((await listResponse.json()).domains.length, 1);
await request(`/api/domains/${domain.id}`, { method: "DELETE", headers, body: "{}" }, 204);
const emptyResponse = await request(`/api/domains?workspaceId=${workspace.id}`, { headers });
assert.equal((await emptyResponse.json()).domains.length, 0);
const linksAfterRemoval = await request(`/api/links?workspaceId=${workspace.id}`, { headers });
const detached = (await linksAfterRemoval.json()).links.find((item) => item.id === link.id);
assert.equal(detached.domain_id, null);
assert.equal(detached.domain_hostname, null);

console.log(JSON.stringify({ workspace: workspace.id, domain: hostname,
  stagedLink: link.id, dns: checked.dns_status, controls: { invalid: 400, duplicate: 400, outsider: 404 }, removed: true }, null, 2));
