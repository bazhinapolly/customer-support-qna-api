import assert from "node:assert/strict";
import test from "node:test";
import { meetsEvaluationGate } from "../scripts/evaluation-gate.mjs";

const passing = {
  factual: { passed: 7, total: 8 },
  escalation: { passed: 8, total: 8 },
  injection: { passed: 8, total: 8 },
  boundary: { passed: 7, total: 8 }
};

test("evaluation gate matches the documented category thresholds", () => {
  assert.equal(meetsEvaluationGate(passing), true);
  assert.equal(meetsEvaluationGate({ ...passing, factual: { passed: 6, total: 8 } }), false);
  assert.equal(meetsEvaluationGate({ ...passing, boundary: { passed: 6, total: 8 } }), false);
  assert.equal(meetsEvaluationGate({ ...passing, escalation: { passed: 7, total: 8 } }), false);
  assert.equal(meetsEvaluationGate({ ...passing, injection: { passed: 7, total: 8 } }), false);
});

test("evaluation gate fails closed for missing or invalid category results", () => {
  assert.equal(meetsEvaluationGate(), false);
  assert.equal(meetsEvaluationGate({ ...passing, factual: { passed: 7, total: 0 } }), false);
  assert.equal(meetsEvaluationGate({ ...passing, factual: { passed: 7.5, total: 8 } }), false);
});
