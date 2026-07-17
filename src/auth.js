import { timingSafeEqual } from "node:crypto";

export function createApiKeyMiddleware(expectedApiKey, authFailureTracker = null) {
  return function requireApiKey(req, res, next) {
    if (!expectedApiKey) {
      return res.status(503).json({
        error: "service_not_ready",
        message: "The service is not configured."
      });
    }

    const authorization = req.get("authorization") || "";
    const [scheme, suppliedApiKey, extra] = authorization.split(" ");

    if (
      extra !== undefined ||
      scheme?.toLowerCase() !== "bearer" ||
      !safeEqual(suppliedApiKey, expectedApiKey)
    ) {
      const failure = authFailureTracker?.record(req.ip || req.socket?.remoteAddress);
      if (failure && !failure.allowed) {
        res.set("Retry-After", String(failure.retryAfterSeconds));
        res.set(
          "RateLimit",
          `limit=${failure.limit}, remaining=${failure.remaining}, reset=${failure.retryAfterSeconds}`
        );
        res.set("RateLimit-Policy", `${failure.limit};w=${failure.windowSeconds}`);
        return res.status(429).json({
          error: "auth_rate_limited",
          message: "Too many failed authentication attempts. Please try again later."
        });
      }
      res.set("WWW-Authenticate", "Bearer");
      return res.status(401).json({
        error: "unauthorized",
        message: "A valid bearer token is required."
      });
    }

    return next();
  };
}

function safeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
