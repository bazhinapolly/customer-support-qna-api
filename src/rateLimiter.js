export function createAuthFailureTracker({ windowMs, limit, now = Date.now }) {
  const buckets = new Map();

  return {
    record(key) {
      const currentTime = now();
      const safeKey = typeof key === "string" && key ? key : "unknown";
      let bucket = buckets.get(safeKey);

      if (!bucket || currentTime >= bucket.resetAt) {
        bucket = { count: 0, resetAt: currentTime + windowMs };
      }

      bucket.count += 1;
      buckets.set(safeKey, bucket);
      return {
        allowed: bucket.count <= limit,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000))
      };
    }
  };
}
