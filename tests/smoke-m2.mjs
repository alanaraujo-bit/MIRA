import assert from "node:assert/strict";

const baseUrl = process.env.MIRA_BASE_URL || "http://localhost:3000";
const runId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const headers = { "content-type": "application/json", "oai-authenticated-user-id": `m2-owner-${runId}`,
  "oai-authenticated-user-email": `m2-${runId}@mira.test` };
const outsiderHeaders = { ...headers, "oai-authenticated-user-id": `m2-outsider-${runId}`,
  "oai-authenticated-user-email": `outsider-${runId}@mira.test` };

async function request(path, init = {}, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}${path}`, init);
  assert.equal(response.status, expectedStatus, `${init.method || "GET"} ${path} should return ${expectedStatus}`);
  return response;
}

const boot = await request("/api/bootstrap", { method: "POST", headers, body: "{}" });
const { selected: workspace } = await boot.json();
const productPage = await request("/product", { headers: { ...headers, accept: "text/html" } });
assert.match(await productPage.text(), /Preparando seu Workspace/);
const campaignsPage = await request("/product/campaigns", { headers: { ...headers, accept: "text/html" } });
assert.match(await campaignsPage.text(), /Organizando campanhas/);

const campaignResponse = await request("/api/campaigns", { method: "POST", headers, body: JSON.stringify({
  workspaceId: workspace.id, name: "Black Friday smoke", objective: "Receita por canal", status: "active",
}) }, 201);
const { campaign } = await campaignResponse.json();
assert.equal(campaign.links, 0);

const slug = `m2-${runId}`;
const linkResponse = await request("/api/links", { method: "POST", headers, body: JSON.stringify({
  workspaceId: workspace.id, title: "Instagram Stories", destinationUrl: "https://example.com/offer?coupon=42", slug,
  campaignId: campaign.id, channel: "Instagram Stories", tags: ["Social", "Mídia Paga", "social"],
  utm: { source: "instagram", medium: "social", campaign: "black-friday", content: "story-a" },
}) }, 201);
const { link } = await linkResponse.json();
assert.equal(link.campaign_id, campaign.id);
assert.equal(link.channel, "Instagram Stories");
assert.deepEqual(link.tags.sort(), ["Mídia Paga", "social"].sort());
const target = new URL(link.destination_url);
assert.equal(target.searchParams.get("coupon"), "42");
assert.equal(target.searchParams.get("utm_source"), "instagram");

const campaignsResponse = await request(`/api/campaigns?workspaceId=${workspace.id}`, { headers });
const campaigns = (await campaignsResponse.json()).campaigns;
assert.equal(campaigns[0].links, 1);

const tagsResponse = await request(`/api/tags?workspaceId=${workspace.id}`, { headers });
const tags = (await tagsResponse.json()).tags;
assert.deepEqual(tags.map((tag) => tag.normalized_name).sort(), ["midia-paga", "social"]);

const filterResponse = await request(`/api/links?workspaceId=${workspace.id}&campaignId=${campaign.id}&tag=midia-paga`, { headers });
assert.deepEqual((await filterResponse.json()).links.map((item) => item.id), [link.id]);

const qrResponse = await request(`/api/links/${link.id}/qr?download=1`, { headers });
assert.match(qrResponse.headers.get("content-type") || "", /^image\/svg\+xml/);
assert.match(qrResponse.headers.get("content-disposition") || "", new RegExp(`mira-${slug}-qr\\.svg`));
assert.match(await qrResponse.text(), /<svg/);
await request(`/api/links/${link.id}/qr`, { headers: outsiderHeaders }, 404);

const redirect = await request(`/go/${slug}`, { redirect: "manual" }, 302);
const redirected = new URL(redirect.headers.get("location"));
assert.equal(redirected.searchParams.get("utm_campaign"), "black-friday");

const endedResponse = await request(`/api/campaigns/${campaign.id}`, { method: "PATCH", headers, body: JSON.stringify({
  status: "ended", expectedUpdatedAt: campaign.updated_at,
}) });
const ended = (await endedResponse.json()).campaign;
assert.equal(ended.status, "ended");
await request(`/api/campaigns/${campaign.id}`, { method: "PATCH", headers, body: JSON.stringify({
  status: "active", expectedUpdatedAt: campaign.updated_at,
}) }, 409);

console.log(JSON.stringify({ workspace: workspace.id, campaign: campaign.id, link: link.id,
  persisted: { campaignLinks: campaigns[0].links, tags: tags.length, utmSource: target.searchParams.get("utm_source") },
  controls: { campaignConflict: 409, unauthorizedQr: 404 }, qr: "svg", redirect: redirect.status }, null, 2));
