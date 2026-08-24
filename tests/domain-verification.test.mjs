import assert from "node:assert/strict";
import test from "node:test";
import { checkDomainDns, normalizeDomainHostname, parseDnsTxtResponse, verificationRecordName } from "../lib/domain-verification.ts";

test("normaliza hostnames públicos sem aceitar URLs ou endereços locais", () => {
  assert.equal(normalizeDomainHostname("  Go.Empresa.COM. "), "go.empresa.com");
  assert.equal(normalizeDomainHostname("xn--caf-dma.example"), "xn--caf-dma.example");
  assert.equal(normalizeDomainHostname("Café.example"), "xn--caf-dma.example");
  assert.throws(() => normalizeDomainHostname("https://go.empresa.com/path"), /apenas o domínio/);
  assert.throws(() => normalizeDomainHostname("localhost"), /público/);
  assert.throws(() => normalizeDomainHostname("127.0.0.1"), /domínio|IP/);
  assert.throws(() => normalizeDomainHostname("-go.empresa.com"), /rótulo/);
});

test("interpreta TXT e confirma somente o token exato", async () => {
  assert.equal(verificationRecordName("go.empresa.com"), "_mira-verification.go.empresa.com");
  assert.deepEqual(parseDnsTxtResponse({ Status: 0, Answer: [{ type: 16, data: '"mira-verification=abc"' }] }), {
    values: ["mira-verification=abc"], responseStatus: 0,
  });
  const verified = await checkDomainDns("go.empresa.com", "abc", async () => Response.json({
    Status: 0, Answer: [{ type: 16, data: '"mira-verification=abc"' }],
  }));
  assert.equal(verified.status, "verified");
  const mismatch = await checkDomainDns("go.empresa.com", "abc", async () => Response.json({ Status: 3 }));
  assert.equal(mismatch.status, "mismatch");
  const unavailable = await checkDomainDns("go.empresa.com", "abc", async () => new Response(null, { status: 503 }));
  assert.equal(unavailable.status, "unreachable");
});
