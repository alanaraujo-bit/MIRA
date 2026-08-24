import assert from "node:assert/strict";

const baseUrl = process.env.MIRA_BASE_URL || "http://localhost:3000";
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const headers = { "content-type": "application/json", "oai-authenticated-user-id": `scale-owner-${runId}`,
  "oai-authenticated-user-email": `scale-${runId}@mira.test` };
const outsider = { ...headers, "oai-authenticated-user-id": `scale-outsider-${runId}`,
  "oai-authenticated-user-email": `scale-outsider-${runId}@mira.test` };

async function request(path, init = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, init);
  assert.equal(response.status, expectedStatus, `${init.method || "GET"} ${path} should return ${expectedStatus}`);
  return response;
}

const boot = await request("/api/bootstrap", { method: "POST", headers, body: "{}" });
const workspace = (await boot.json()).selected;
const campaignResponse = await request("/api/campaigns", { method: "POST", headers, body: JSON.stringify({
  workspaceId: workspace.id, name: "Scale campaign", objective: "Validate keyset pagination",
}) }, 201);
const campaign = (await campaignResponse.json()).campaign;
const inspectorPage = await request(`/product/campaigns/${campaign.id}`, { headers: { ...headers, accept: "text/html" } });
assert.match(await inspectorPage.text(), /Lendo a Campaign/);

const presetResponse = await request("/api/utm-presets", { method: "POST", headers, body: JSON.stringify({
  workspaceId: workspace.id, name: "Social Orgânico", utm: { source: "Instagram Brasil", medium: "Mídia Social", campaign: "Agosto 2026" },
}) }, 201);
const preset = (await presetResponse.json()).preset;
assert.equal(preset.source, "instagram-brasil");
assert.equal(preset.medium, "midia-social");
await request("/api/utm-presets", { method: "POST", headers, body: JSON.stringify({
  workspaceId: workspace.id, name: "Social Orgânico", utm: { source: "duplicate" },
}) }, 400);

const created = [];
for (let index = 0; index < 27; index += 1) {
  const response = await request("/api/links", { method: "POST", headers, body: JSON.stringify({
    workspaceId: workspace.id, title: `Scale Link ${String(index).padStart(2, "0")}`,
    destinationUrl: `https://example.com/scale/${index}`, slug: `scale-${runId}-${index}`,
    campaignId: campaign.id, channel: index % 2 === 0 ? "Instagram" : "E-mail", tags: ["Escala"],
    utm: { source: "Instagram Brasil", medium: "Mídia Social", campaign: "Agosto 2026" },
  }) }, 201);
  created.push((await response.json()).link);
}
assert.equal(created[0].utm_source, "instagram-brasil");

const firstResponse = await request(`/api/links?workspaceId=${workspace.id}&limit=25`, { headers });
const first = await firstResponse.json();
assert.equal(first.total, 27);
assert.equal(first.links.length, 25);
assert.ok(first.nextCursor);
const secondResponse = await request(`/api/links?workspaceId=${workspace.id}&limit=25&cursor=${encodeURIComponent(first.nextCursor)}`, { headers });
const second = await secondResponse.json();
assert.equal(second.links.length, 2);
assert.equal(second.nextCursor, null);
assert.equal(new Set([...first.links, ...second.links].map((link) => link.id)).size, 27);
await request(`/api/links?workspaceId=${workspace.id}&cursor=not-a-valid-cursor`, { headers }, 400);

const favoriteTarget = first.links[0];
const favoriteResponse = await request(`/api/links/${favoriteTarget.id}/favorite`, { method: "PUT", headers,
  body: JSON.stringify({ favorite: true }) });
assert.equal((await favoriteResponse.json()).link.is_favorite, true);
const favoriteList = await request(`/api/links?workspaceId=${workspace.id}&favorites=1`, { headers });
const favoritePayload = await favoriteList.json();
assert.equal(favoritePayload.total, 1);
assert.equal(favoritePayload.links[0].id, favoriteTarget.id);
await request(`/api/links/${favoriteTarget.id}/favorite`, { method: "PUT", headers: outsider,
  body: JSON.stringify({ favorite: true }) }, 404);

const detailResponse = await request(`/api/campaigns/${campaign.id}`, { headers });
const detail = (await detailResponse.json()).campaign;
assert.equal(detail.links, 27);
assert.deepEqual(detail.channels.map((channel) => channel.channel).sort(), ["E-mail", "Instagram"]);
assert.equal(detail.top_links.length, 27);

await request(`/api/utm-presets/${preset.id}`, { method: "DELETE", headers, body: "{}" }, 204);
const presetsResponse = await request(`/api/utm-presets?workspaceId=${workspace.id}`, { headers });
assert.equal((await presetsResponse.json()).presets.length, 0);

console.log(JSON.stringify({ workspace: workspace.id, campaign: campaign.id,
  pagination: { total: first.total, first: first.links.length, second: second.links.length },
  favorite: favoritePayload.links[0].slug, channels: detail.channels.length,
  utm: { source: preset.source, medium: preset.medium }, controls: { invalidCursor: 400, outsiderFavorite: 404, duplicatePreset: 400 } }, null, 2));
