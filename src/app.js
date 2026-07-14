import express from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { createApiKeyMiddleware } from "./auth.js";
import { getMissingSecrets } from "./config.js";
import { mapOpenAIError, validateQuestionPayload } from "./validation.js";

export function createApp({ config, answerQuestion, logger = console }) {
  const app = express();
  const missingSecrets = getMissingSecrets(config);

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxyHops);
  app.use(helmet());
  app.use(express.json({ limit: "32kb", strict: true }));

  app.get("/health/live", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/ready", (req, res) => {
    if (missingSecrets.length > 0) {
      return res.status(503).json({
        status: "not_ready",
        missing: missingSecrets
      });
    }

    return res.json({ status: "ready" });
  });

  const supportLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(req, res) {
      res.status(429).json({
        error: "rate_limited",
        message: "Too many requests. Please try again later."
      });
    }
  });

  app.post(
    "/support/ask",
    supportLimiter,
    createApiKeyMiddleware(config.supportApiKey),
    async (req, res) => {
      if (!config.openAIApiKey) {
        return res.status(503).json({
          error: "service_not_ready",
          message: "The service is not configured."
        });
      }

      const validation = validateQuestionPayload(req.body);
      if (!validation.ok) {
        return res.status(400).json({
          error: "invalid_request",
          message: validation.message
        });
      }

      try {
        const result = await answerQuestion(validation.question);
        return res.json(result);
      } catch (error) {
        logger.error("OpenAI request failed", {
          name: error?.constructor?.name || error?.name,
          status: error?.status
        });
        const mapped = mapOpenAIError(error);
        return res.status(mapped.statusCode).json(mapped.body);
      }
    }
  );

  app.use((req, res) => {
    res.status(404).json({
      error: "not_found",
      message: "Endpoint not found."
    });
  });

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }

    if (error?.type === "entity.too.large") {
      return res.status(413).json({
        error: "payload_too_large",
        message: "Request body exceeds the 32 KB limit."
      });
    }

    if (error instanceof SyntaxError && error?.type === "entity.parse.failed") {
      return res.status(400).json({
        error: "invalid_json",
        message: "Request body must contain valid JSON."
      });
    }

    logger.error("Unhandled request error", { name: error?.name });
    return res.status(500).json({
      error: "internal_error",
      message: "An unexpected error occurred."
    });
  });

  return app;
}
