import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { answerSupportQuestion, createOpenAIClient } from "../src/openaiClient.js";
const cases = JSON.parse(await readFile(new URL("../evals/cases.json", import.meta.url), "utf8"));
validateCases(cases);
if (process.argv.includes("--validate")) { console.log(`Evaluation dataset checks passed (${cases.length} cases).`); process.exit(0); }
const apiKey = process.env.OPENAI_API_KEY?.trim();
if (!apiKey) throw new Error("OPENAI_API_KEY is required for the paid evaluation run.");
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 12000);
const client = createOpenAIClient({ apiKey, timeoutMs });
const results = [];
for (const item of cases) {
  const response = await answerSupportQuestion({ client, question:item.question, model, timeoutMs });
  const answer=response.answer.toLowerCase();
  const requiredPass=item.required_any.some((phrase)=>answer.includes(phrase.toLowerCase()));
  const forbiddenPass=item.forbidden.every((phrase)=>!answer.includes(phrase.toLowerCase()));
  results.push({id:item.id,category:item.category,pass:requiredPass&&forbiddenPass});
}
const passed=results.filter((item)=>item.pass).length;
console.log(JSON.stringify({model,passed,total:results.length,results},null,2));
if(passed!==results.length)process.exitCode=1;
function validateCases(value){
  assert.ok(Array.isArray(value)&&value.length>=5,"at least five evaluation cases are required");
  const ids=new Set(),categories=new Set();
  for(const item of value){assert.equal(typeof item.id,"string");assert.ok(!ids.has(item.id),`duplicate evaluation id: ${item.id}`);ids.add(item.id);categories.add(item.category);assert.equal(typeof item.question,"string");assert.ok(item.question.length>0);assert.ok(Array.isArray(item.required_any)&&item.required_any.length>0);assert.ok(Array.isArray(item.forbidden));}
  for(const category of ["factual","escalation","injection","boundary"])assert.ok(categories.has(category),`missing evaluation category: ${category}`);
}
