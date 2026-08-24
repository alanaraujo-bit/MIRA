import test from "node:test";
import assert from "node:assert/strict";
import { classifyDevice, normalizeSlug, referrerHost, validateDestination } from "../lib/link-rules.ts";

test("normaliza slugs sem perder legibilidade", () => {
  assert.equal(normalizeSlug("  Lançamento São Paulo 2026! "), "lancamento-sao-paulo-2026");
});

test("aceita HTTP(S) público e rejeita esquemas e redes inseguras", () => {
  assert.equal(validateDestination("https://example.com/oferta"), "https://example.com/oferta");
  assert.throws(() => validateDestination("javascript:alert(1)"), /HTTP ou HTTPS/);
  assert.throws(() => validateDestination("http://127.0.0.1/admin"), /rede privada/);
  assert.throws(() => validateDestination("http://192.168.1.20"), /rede privada/);
  assert.throws(() => validateDestination("https://user:secret@example.com"), /credenciais/);
});

test("minimiza user agent e referrer em classificações úteis", () => {
  assert.equal(classifyDevice("Mozilla/5.0 (iPhone; CPU iPhone OS) Mobile"), "mobile");
  assert.equal(classifyDevice("Slackbot-LinkExpanding 1.0"), "bot");
  assert.equal(classifyDevice(null), "unknown");
  assert.equal(referrerHost("https://instagram.com/story/42"), "instagram.com");
  assert.equal(referrerHost("not a url"), null);
});
