export function createAuthFailureTracker({ windowMs, limit, maxBuckets = 10000, now = Date.now }) {
  const buckets = new Map();
  let operations = 0;

  function prune(currentTime) {
    for (const [key, bucket] of buckets) {
      if (currentTime >= bucket.resetAt) buckets.delete(key);
    }
  }

  function evictOldest() {
    let oldestKey;
    let oldestReset = Infinity;
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt < oldestReset) {
        oldestKey = key;
        oldestReset = bucket.resetAt;
      }
    }
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }

  return {
    record(key) {
      const currentTime = now();
      const safeKey = typeof key === "string" && key ? key : "unknown";
      operations += 1;
      if (operations % 128 === 0 || (!buckets.has(safeKey) && buckets.size >= maxBuckets)) {
        prune(currentTime);
      }
      if (!buckets.has(safeKey) && buckets.size >= maxBuckets) evictOldest();
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
    },
    size() {
      return buckets.size;
    }
  };
}
