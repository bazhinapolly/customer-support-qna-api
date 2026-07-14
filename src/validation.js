const MAX_QUESTION_LENGTH = 2000;

export function validateQuestionPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  if (typeof payload.question !== "string") {
    return {
      ok: false,
      message: "Field 'question' is required and must be a string."
    };
  }

  const question = payload.question.trim();

  if (!question) {
    return { ok: false, message: "Question cannot be empty." };
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      message: `Question is too long. Maximum length is ${MAX_QUESTION_LENGTH} characters.`
    };
  }

  return { ok: true, question };
}

export function mapOpenAIError(error) {
  const status = error?.status ?? error?.response?.status;
  const name = error?.constructor?.name || error?.name;

  if (status === 429 || name === "RateLimitError") {
    return {
      statusCode: 503,
      body: {
        error: "provider_rate_limited",
        message: "The answer service is temporarily unavailable. Please try again later."
      }
    };
  }

  if (
    name === "APIConnectionTimeoutError" ||
    name === "APIUserAbortError" ||
    name === "AbortError" ||
    name === "TimeoutError"
  ) {
    return {
      statusCode: 504,
      body: {
        error: "provider_timeout",
        message: "The answer service took too long to respond."
      }
    };
  }

  return {
    statusCode: 502,
    body: {
      error: "provider_error",
      message: "The answer service returned an unexpected error."
    }
  };
}
