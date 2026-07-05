export function validateQuestionPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  if (typeof payload.question !== "string") {
    return { ok: false, message: "Field 'question' is required and must be a string." };
  }

  const question = payload.question.trim();

  if (!question) {
    return { ok: false, message: "Question cannot be empty." };
  }

  if (question.length > 2000) {
    return { ok: false, message: "Question is too long. Maximum length is 2000 characters." };
  }

  return { ok: true, question };
}

export function mapOpenAIError(error) {
  const status = error?.status || error?.response?.status;
  const code = error?.code || error?.name;

  if (status === 429) {
    return {
      statusCode: 429,
      body: {
        error: "rate_limited",
        message: "The AI provider is currently rate limited. Please try again shortly."
      }
    };
  }

  if (code === "AbortError" || code === "TimeoutError") {
    return {
      statusCode: 504,
      body: {
        error: "timeout",
        message: "The AI provider took too long to respond."
      }
    };
  }

  return {
    statusCode: 502,
    body: {
      error: "ai_provider_error",
      message: "The AI provider returned an unexpected error."
    }
  };
}
