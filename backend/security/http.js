const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX_ENTRIES = 10_000;

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const parseAllowedOrigins = (
  value = process.env.CORS_ALLOWED_ORIGINS || "",
) =>
  new Set(
    value
      .split(",")
      .map((origin) => normalizeOrigin(origin.trim()))
      .filter(Boolean),
  );

export const isRequestOriginAllowed = (req, allowedOrigins) => {
  const origin = req.get("Origin");
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  if (allowedOrigins.has(normalizedOrigin)) return true;

  const host = req.get("Host");
  if (!host) return false;

  return normalizedOrigin === `${req.protocol}://${host}`;
};

export const createRateLimiter = ({
  limit,
  windowMs = DEFAULT_RATE_LIMIT_WINDOW_MS,
  maxEntries = DEFAULT_RATE_LIMIT_MAX_ENTRIES,
}) => {
  const clients = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const current = clients.get(key);

    if (!current || current.resetAt <= now) {
      if (clients.size >= maxEntries) {
        const oldestKey = clients.keys().next().value;
        clients.delete(oldestKey);
      }
      clients.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    clients.delete(key);
    clients.set(key, current);

    if (current.count > limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      );
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ message: "Too many requests" });
    }

    return next();
  };
};

export const securityHeaders = (req, res, next) => {
  res.set({
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
  });
  next();
};

export const rejectQueryAuthentication = (req, res, next) => {
  if (Object.hasOwn(req.query, "token")) {
    return res.status(400).json({
      message: "Authentication tokens must use the Authorization header",
    });
  }
  return next();
};
