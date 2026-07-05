import "dotenv/config";
import express from "express";
import { answerSupportQuestion, createOpenAIClient } from "./openaiClient.js";
import { mapOpenAIError, validateQuestionPayload } from "./validation.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 12000);

app.use(express.json({ limit: "32kb" }));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/support/ask", async (req, res) => {
  const validation = validateQuestionPayload(req.body);

  if (!validation.ok) {
    return res.status(400).json({
      error: "invalid_request",
      message: validation.message
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "missing_configuration",
      message: "OPENAI_API_KEY is not configured."
    });
  }

  try {
    const client = createOpenAIClient(process.env.OPENAI_API_KEY);
    const result = await answerSupportQuestion({
      client,
      question: validation.question,
      model,
      timeoutMs
    });

    return res.json(result);
  } catch (error) {
    const mapped = mapOpenAIError(error);
    return res.status(mapped.statusCode).json(mapped.body);
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: "not_found",
    message: "Endpoint not found."
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, host, () => {
    console.log(`Customer support Q&A API running on http://${host}:${port}`);
  });
}

export default app;
