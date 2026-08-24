import assert from "node:assert/strict";
import test from "node:test";
import { normalizeEmail, validatePassword } from "../lib/auth-rules.ts";

test("normaliza e valida e-mails públicos", () => {
  assert.equal(normalizeEmail("  Alan@Empresa.COM "), "alan@empresa.com");
  assert.throws(() => normalizeEmail("sem-dominio"), /e-mail válido/);
  assert.throws(() => normalizeEmail("a @empresa.com"), /e-mail válido/);
});

test("exige senha longa com letra e número", () => {
  assert.equal(validatePassword("mira-segura-2026"), "mira-segura-2026");
  assert.throws(() => validatePassword("curta1"), /10 caracteres/);
  assert.throws(() => validatePassword("somenteletras"), /letra e um número/);
  assert.throws(() => validatePassword("12345678901"), /letra e um número/);
});
