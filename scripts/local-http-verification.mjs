import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

const SUPPORT_API_KEY = "a".repeat(64);
class APIConnectionTimeoutError extends Error {}
const config = loadConfig({
  HOST: "127.0.0.1",
  PORT: "3100",
  OPENAI_API_KEY: "local-fixture-provider-key",
  SUPPORT_API_KEY,
  AUTH_FAILURE_RATE_LIMIT_MAX: "1",
  RATE_LIMIT_MAX: "10"
});

const app = createApp({
  config,
  logger: { error() {} },
  answerQuestion: async (question) => {
    if (question === "simulate provider timeout") {
      throw new APIConnectionTimeoutError("Local verification timeout");
    }
    return {
      answer: "Same-day appointments are not guaranteed. Request a quote through the website form.",
      model: "local-verification-fixture",
      usage: null
    };
  }
});

const server = app.listen(config.port, config.host, () => {
  console.log(`Local HTTP verification server: http://${config.host}:${config.port}`);
  console.log(`Fixture bearer token: ${SUPPORT_API_KEY}`);
  console.log("No OpenAI request is made by this verification server.");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
