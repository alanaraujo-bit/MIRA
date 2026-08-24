import test from "node:test";
import assert from "node:assert/strict";
import { comparePeriods } from "../lib/analytics-rules.ts";

test("compara períodos sem inventar percentual quando a base é zero", () => {
  assert.deepEqual(comparePeriods(12, 0), { current: 12, previous: 0, deltaPercent: null, direction: "new" });
  assert.deepEqual(comparePeriods(0, 0), { current: 0, previous: 0, deltaPercent: 0, direction: "flat" });
});

test("expõe crescimento e queda com uma casa decimal", () => {
  assert.deepEqual(comparePeriods(15, 10), { current: 15, previous: 10, deltaPercent: 50, direction: "up" });
  assert.deepEqual(comparePeriods(7, 8), { current: 7, previous: 8, deltaPercent: -12.5, direction: "down" });
});
