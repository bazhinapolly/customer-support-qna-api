import OpenAI from "openai";
import { buildSystemPrompt, buildUserPrompt } from "./prompt.js";
import { supportContext } from "./supportContext.js";

export function createOpenAIClient(apiKey) {
  return new OpenAI({ apiKey });
}

export async function answerSupportQuestion({
  client,
  question,
  model = "gpt-4o-mini",
  timeoutMs = 12000
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        temperature: 0.2,
        max_tokens: 350,
        messages: [
          { role: "system", content: buildSystemPrompt(supportContext) },
          { role: "user", content: buildUserPrompt(question) }
        ]
      },
      { signal: controller.signal }
    );

    const answer = completion.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error("OpenAI response did not include an answer.");
    }

    return {
      answer,
      model,
      usage: completion.usage || null
    };
  } finally {
    clearTimeout(timeout);
  }
}
