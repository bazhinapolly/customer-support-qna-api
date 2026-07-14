import { timingSafeEqual } from "node:crypto";

export function createApiKeyMiddleware(expectedApiKey) {
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
