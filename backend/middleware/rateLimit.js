const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 30, keyPrefix = 'global' } = {}) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
    const now = Date.now();
    const current = buckets.get(key) || { count: 0, resetAt: now + windowMs };
    if (current.resetAt <= now) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }
    current.count += 1;
    buckets.set(key, current);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - current.count)));
    if (current.count > max) {
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }
    next();
  };
}