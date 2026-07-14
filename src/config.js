const DEFAULTS = Object.freeze({
  host: "127.0.0.1",
  port: 3000,
  model: "gpt-4o-mini",
  timeoutMs: 12000,
  rateLimitWindowMs: 60000,
  rateLimitMax: 30,
  trustProxyHops: 0
});

export function loadConfig(env = process.env) {
  const config = {
    host: env.HOST || DEFAULTS.host,
    port: parseInteger(env.PORT, "PORT", DEFAULTS.port, 1, 65535),
    model: env.OPENAI_MODEL || DEFAULTS.model,
    timeoutMs: parseInteger(
      env.REQUEST_TIMEOUT_MS,
      "REQUEST_TIMEOUT_MS",
      DEFAULTS.timeoutMs,
      1000,
      120000
    ),
    rateLimitWindowMs: parseInteger(
      env.RATE_LIMIT_WINDOW_MS,
      "RATE_LIMIT_WINDOW_MS",
      DEFAULTS.rateLimitWindowMs,
      1000,
      3600000
    ),
    rateLimitMax: parseInteger(
      env.RATE_LIMIT_MAX,
      "RATE_LIMIT_MAX",
      DEFAULTS.rateLimitMax,
      1,
      10000
    ),
    trustProxyHops: parseInteger(
      env.TRUST_PROXY_HOPS,
      "TRUST_PROXY_HOPS",
      DEFAULTS.trustProxyHops,
      0,
      10
    ),
    openAIApiKey: normalizeSecret(env.OPENAI_API_KEY),
    supportApiKey: normalizeSecret(env.SUPPORT_API_KEY)
  };

  return config;
}

export function getMissingSecrets(config) {
  return [
    !config.openAIApiKey && "OPENAI_API_KEY",
    !config.supportApiKey && "SUPPORT_API_KEY"
  ].filter(Boolean);
}

function parseInteger(rawValue, name, fallback, min, max) {
  if (rawValue === undefined || rawValue === "") {
    return fallback;
  }

  if (!/^\d+$/.test(rawValue)) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }

  return value;
}

function normalizeSecret(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
