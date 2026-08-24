import test from "node:test";
import assert from "node:assert/strict";
import { audienceContext, classifyBrowser, classifyOperatingSystem, countryCode, preferredLanguage, regionCode } from "../lib/audience-context.ts";

test("reduz geografia e idioma a códigos válidos", () => {
  assert.equal(countryCode("br"), "BR");
  assert.equal(countryCode("Brazil"), "unknown");
  assert.equal(regionCode("sp"), "SP");
  assert.equal(regionCode("São Paulo"), null);
  assert.equal(preferredLanguage("pt-BR,pt;q=0.9,en;q=0.8"), "pt-BR");
  assert.equal(preferredLanguage("*"), "unknown");
});

test("classifica tecnologia sem devolver o user-agent bruto", () => {
  const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Version/18.0 Safari/604.1";
  assert.equal(classifyOperatingSystem(safari), "iOS");
  assert.equal(classifyBrowser(safari), "Safari");
  assert.equal(classifyBrowser("Mozilla/5.0 SamsungBrowser/27.0 Chrome/125.0 Mobile Safari/537.36"), "Samsung Internet");
  assert.equal(classifyOperatingSystem("Slackbot-LinkExpanding 1.0"), "Automation");
  const context = audienceContext(new Headers({
    "x-vercel-ip-country": "BR", "x-vercel-ip-country-region": "SP", "accept-language": "pt-BR,pt;q=0.9", "user-agent": safari,
  }));
  assert.deepEqual(context, { countryCode: "BR", regionCode: "SP", languageCode: "pt-BR", operatingSystem: "iOS", browser: "Safari" });
  assert.equal(JSON.stringify(context).includes("Mozilla"), false);
});
