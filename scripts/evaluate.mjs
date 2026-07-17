import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { answerSupportQuestion, createOpenAIClient } from "../src/openaiClient.js";

const dataset = JSON.parse(await readFile(new URL("../evals/cases.json", import.meta.url), "utf8"));
validateDataset(dataset);

if (process.argv.includes("--validate")) {
  console.log(`Evaluation dataset checks passed (${dataset.cases.length} cases, version ${dataset.version}).`);
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) throw new Error("OPENAI_API_KEY is required for the paid evaluation run.");
const model = process.env.OPENAI_MODEL || "gpt-4o-mini-2024-07-18";
const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 12000);
const client = createOpenAIClient({ apiKey, timeoutMs });
const results = [];

for (const item of dataset.cases) {
  const response = await answerSupportQuestion({ client, question: item.question, model, timeoutMs });
  const answer = response.answer.toLowerCase();
  const requiredPass = item.required_any.some((phrase) => answer.includes(phrase.toLowerCase()));
  const forbiddenPass = item.forbidden.every((phrase) => !answer.includes(phrase.toLowerCase()));
  results.push({ id: item.id, category: item.category, pass: requiredPass && forbiddenPass });
}

const categories = Object.fromEntries(
  ["factual", "escalation", "injection", "boundary"].map((category) => {
    const categoryResults = results.filter((item) => item.category === category);
    const passed = categoryResults.filter((item) => item.pass).length;
    return [category, { passed, total: categoryResults.length, pass_rate: passed / categoryResults.length }];
  })
);
const passed = results.filter((item) => item.pass).length;
console.log(JSON.stringify({
  dataset_version: dataset.version,
  evaluated_at: new Date().toISOString(),
  model,
  passed,
  total: results.length,
  pass_rate: passed / results.length,
  categories,
  results
}, null, 2));
if (passed !== results.length) process.exitCode = 1;

function validateDataset(value) {
  assert.equal(typeof value?.version, "string", "dataset version is required");
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(value.version), "dataset version must be YYYY-MM-DD");
  assert.ok(Array.isArray(value.cases) && value.cases.length >= 30, "at least 30 evaluation cases are required");
  const ids = new Set();
  const categoryCounts = new Map();
  for (const item of value.cases) {
    assert.equal(typeof item.id, "string");
    assert.ok(!ids.has(item.id), `duplicate evaluation id: ${item.id}`);
    ids.add(item.id);
    categoryCounts.set(item.category, (categoryCounts.get(item.category) || 0) + 1);
    assert.equal(typeof item.question, "string");
    assert.ok(item.question.length > 0);
    assert.ok(Array.isArray(item.required_any) && item.required_any.length > 0);
    assert.ok(Array.isArray(item.forbidden));
  }
  for (const category of ["factual", "escalation", "injection", "boundary"]) {
    assert.ok((categoryCounts.get(category) || 0) >= 7, `at least seven ${category} cases are required`);
  }
}
