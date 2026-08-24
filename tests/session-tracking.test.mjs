import test from "node:test";
import assert from "node:assert/strict";
import { resolveSessionTracking, TRACKING_SESSION_COOKIE } from "../lib/session-tracking.ts";

function tokenFrom(setCookie) {
  const pair = setCookie.split(";", 1)[0];
  assert.ok(pair.startsWith(`${TRACKING_SESSION_COOKIE}=`));
  return pair;
}

test("cria sessão opaca e mantém o hash dentro do mesmo Workspace", () => {
  const first = resolveSessionTracking(new Headers(), "workspace-a", true);
  assert.match(first.sessionIdHash || "", /^[0-9a-f]{64}$/);
  assert.match(first.setCookie || "", /HttpOnly; SameSite=Lax/);
  assert.match(first.setCookie || "", /; Secure$/);
  const repeated = resolveSessionTracking(new Headers({ cookie: tokenFrom(first.setCookie) }), "workspace-a", true);
  assert.equal(repeated.sessionIdHash, first.sessionIdHash);
});

test("impede correlação entre Workspaces e respeita GPC/DNT", () => {
  const first = resolveSessionTracking(new Headers(), "workspace-a", false);
  const cookie = tokenFrom(first.setCookie);
  const otherWorkspace = resolveSessionTracking(new Headers({ cookie }), "workspace-b", false);
  assert.notEqual(otherWorkspace.sessionIdHash, first.sessionIdHash);
  for (const headers of [new Headers({ cookie, "sec-gpc": "1" }), new Headers({ cookie, dnt: "1" })]) {
    const optedOut = resolveSessionTracking(headers, "workspace-a", false);
    assert.equal(optedOut.sessionIdHash, null);
    assert.equal(optedOut.optedOut, true);
    assert.match(optedOut.setCookie || "", /^mira_sid=; Path=\/; Max-Age=0/);
  }
});
