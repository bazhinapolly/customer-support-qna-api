import OpenAI from "openai";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { fictionalSupportContext } from "./supportContext.js";

export class ProviderResponseError extends Error {
  constructor(code, message) { super(message); this.name = "ProviderResponseError"; this.code = code; }
}

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
      store: false,
      max_output_tokens: 350,
      temperature: 0.2
    },
    { timeout: timeoutMs }
  );
  assertCompletedResponse(response);

  const answer = response.output_text?.trim();

  if (!answer) {
    throw new ProviderResponseError("missing_output", "OpenAI response did not include completed answer text.");
  }

  return {
    answer,
    model: response.model || model,
    usage: normalizeUsage(response.usage)
  };
}

function assertCompletedResponse(response) {
  if (!response || response.status !== "completed") {
    throw new ProviderResponseError("incomplete_response", "OpenAI response was not completed.");
  }
  if (response.error) throw new ProviderResponseError("provider_response_error", "OpenAI returned an error response.");
  for (const output of response.output || []) {
    for (const content of output?.content || []) {
      if (content?.type === "refusal") throw new ProviderResponseError("provider_refusal", "OpenAI refused the support request.");
    }
  }
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
