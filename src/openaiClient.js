import OpenAI from "openai";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { fictionalSupportContext } from "./supportContext.js";

export function createOpenAIClient({ apiKey, timeoutMs }) {
  return new OpenAI({
    apiKey,
    timeout: timeoutMs,
    maxRetries: 2
  });
}

export async function answerSupportQuestion({
  client,
  question,
  model,
  timeoutMs
}) {
  const response = await client.responses.create(
    {
      model,
      instructions: buildSystemPrompt(fictionalSupportContext),
      input: buildUserPrompt(question),
      max_output_tokens: 350,
      temperature: 0.2
    },
    { timeout: timeoutMs }
  );

  const answer = response.output_text?.trim();

  if (!answer) {
    throw new Error("OpenAI response did not include answer text.");
  }

  return {
    answer,
    model: response.model || model,
    usage: normalizeUsage(response.usage)
  };
}

function normalizeUsage(usage) {
  if (!usage) {
    return null;
  }

  return {
    input_tokens: usage.input_tokens ?? null,
    output_tokens: usage.output_tokens ?? null,
    total_tokens: usage.total_tokens ?? null
  };
}
