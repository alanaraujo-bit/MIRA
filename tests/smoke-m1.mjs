import assert from "node:assert/strict";

const baseUrl = process.env.MIRA_BASE_URL || "http://localhost:3000";
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const ownerHeaders = {
  "content-type": "application/json",
  "oai-authenticated-user-id": `smoke-owner-${runId}`,
  "oai-authenticated-user-email": `owner-${runId}@mira.test`,
};
const otherHeaders = {
  "content-type": "application/json",
  "oai-authenticated-user-id": `smoke-other-${runId}`,
  "oai-authenticated-user-email": `other-${runId}@mira.test`,
};

async function request(path, init = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, init);
  assert.equal(response.status, expectedStatus, `${init.method || "GET"} ${path} should return ${expectedStatus}`);
  return response;
}

const bootstrap = await request("/api/bootstrap", {
  method: "POST",
  headers: ownerHeaders,
  body: "{}",
});
const { selected: workspace } = await bootstrap.json();
assert.equal(workspace.role, "owner");

const slug = `smoke-${runId}`;
const createResponse = await request("/api/links", {
  method: "POST",
  headers: ownerHeaders,
  body: JSON.stringify({
    workspaceId: workspace.id,
    title: "Smoke original",
    destinationUrl: "https://example.com/mira-smoke",
    slug,
  }),
}, 201);
const { link: created } = await createResponse.json();
assert.equal(created.status, "active");

const searchResponse = await request(`/api/links?workspaceId=${workspace.id}&query=${slug}&status=active`, { headers: ownerHeaders });
const searchPayload = await searchResponse.json();
assert.deepEqual(searchPayload.links.map((link) => link.id), [created.id]);

const editResponse = await request(`/api/links/${created.id}`, {
  method: "PATCH",
  headers: ownerHeaders,
  body: JSON.stringify({
    title: "Smoke edited",
    destinationUrl: "https://example.com/mira-smoke-edited",
    slug,
    expectedUpdatedAt: created.updated_at,
  }),
});
const { link: edited } = await editResponse.json();
assert.equal(edited.title, "Smoke edited");
assert.equal(edited.destination_url, "https://example.com/mira-smoke-edited");

await request(`/api/links/${created.id}`, {
  method: "PATCH",
  headers: ownerHeaders,
  body: JSON.stringify({ title: "Stale overwrite", expectedUpdatedAt: created.updated_at }),
}, 409);

await request(`/api/links?workspaceId=${workspace.id}`, { headers: otherHeaders }, 403);
await request(`/api/links/${created.id}`, {
  method: "PATCH",
  headers: otherHeaders,
  body: JSON.stringify({ title: "Unauthorized", expectedUpdatedAt: edited.updated_at }),
}, 404);

const archiveResponse = await request(`/api/links/${created.id}`, {
  method: "PATCH",
  headers: ownerHeaders,
  body: JSON.stringify({ status: "archived", expectedUpdatedAt: edited.updated_at }),
});
const { link: archived } = await archiveResponse.json();
assert.equal(archived.status, "archived");
await request(`/go/${slug}`, { redirect: "manual" }, 404);

const restoreResponse = await request(`/api/links/${created.id}`, {
  method: "PATCH",
  headers: ownerHeaders,
  body: JSON.stringify({ status: "active", expectedUpdatedAt: archived.updated_at }),
});
const { link: restored } = await restoreResponse.json();
assert.equal(restored.status, "active");

const redirectResponse = await request(`/go/${slug}`, {
  redirect: "manual",
  headers: { referer: "https://instagram.com/story/42", "user-agent": "Mozilla/5.0 (iPhone) Mobile" },
}, 302);
assert.equal(redirectResponse.headers.get("location"), "https://example.com/mira-smoke-edited");
assert.match(redirectResponse.headers.get("server-timing") || "", /^resolve;dur=/);
assert.match(redirectResponse.headers.get("x-mira-request-id") || "", /^[0-9a-f-]{36}$/);

await new Promise((resolve) => setTimeout(resolve, 80));
const summaryResponse = await request(`/api/analytics/summary?workspaceId=${workspace.id}`, { headers: ownerHeaders });
const { summary } = await summaryResponse.json();
assert.equal(summary.activeLinks, 1);
assert.equal(summary.clicks7d, 1);
assert.deepEqual(summary.devices, [{ name: "mobile", value: 1 }]);

await request("/api/links", {
  method: "POST",
  headers: ownerHeaders,
  body: JSON.stringify({
    workspaceId: workspace.id,
    title: "Unsafe",
    destinationUrl: "http://127.0.0.1/admin",
    slug: `unsafe-${runId}`,
  }),
}, 400);

await request("/api/links", {
  method: "POST",
  headers: { ...ownerHeaders, origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
  body: JSON.stringify({ workspaceId: workspace.id, title: "Cross-site", destinationUrl: "https://example.com", slug: `csrf-${runId}` }),
}, 403);

await request("/api/links", {
  method: "POST",
  headers: { ...ownerHeaders, "content-type": "text/plain" },
  body: JSON.stringify({ workspaceId: workspace.id, title: "Wrong type", destinationUrl: "https://example.com", slug: `type-${runId}` }),
}, 415);

console.log(JSON.stringify({
  workspace: workspace.id,
  link: created.id,
  redirect: redirectResponse.status,
  clicks: summary.clicks7d,
  device: summary.devices[0].name,
  controls: { staleWrite: 409, crossWorkspace: 403, unauthorizedEdit: 404, unsafeDestination: 400, crossSite: 403, wrongContentType: 415 },
}, null, 2));
