import "dotenv/config";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { answerSupportQuestion, createOpenAIClient } from "./openaiClient.js";

let config;

try {
  config = loadConfig();
} catch (error) {
  console.error(`Configuration error: ${error.message}`);
  process.exitCode = 1;
  throw error;
}

const client = config.openAIApiKey
  ? createOpenAIClient({
      apiKey: config.openAIApiKey,
      timeoutMs: config.timeoutMs
    })
  : null;

const app = createApp({
  config,
  answerQuestion(question) {
    return answerSupportQuestion({
      client,
      question,
      model: config.model,
      timeoutMs: config.timeoutMs
    });
  }
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Customer Support Q&A API listening on http://${config.host}:${config.port}`);
});

server.on("error", (error) => {
  console.error("HTTP server error", error);
  process.exitCode = 1;
});

function shutDown(signal) {
  console.log(`${signal} received; closing HTTP server.`);
  server.close((error) => {
    if (error) {
      console.error("Failed to close HTTP server", error);
      process.exitCode = 1;
    }
  });
}

process.once("SIGINT", () => shutDown("SIGINT"));
process.once("SIGTERM", () => shutDown("SIGTERM"));
