import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const isRateLimitEnabled = (): boolean => {
  return process.env.RATE_LIMIT_ENABLED !== 'false';
};

const getMultiplier = (): number => {
  return process.env.NODE_ENV !== 'production' ? 10 : 1;
};

/**
 * Keyed by IP + email for auth attempts (login & register).
 * Base limit: 10 requests / 15 minutes.
 * Multiplied by 10 when NODE_ENV !== 'production'.
 * Configurable via RATE_LIMIT_ENABLED.
 * skipSuccessfulRequests: true
 */
export const createAuthAttemptLimiter = (options: {
  baseMax?: number;
  windowMs?: number;
} = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  const baseMax = options.baseMax || 10;
  const store: RateLimitStore = {};

  const limiter = (req: Request, res: Response, next: NextFunction) => {
    if (!isRateLimitEnabled()) {
      return next();
    }

    const maxAttempts = baseMax * getMultiplier();
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'unknown';
    const key = `${ip}:${rawEmail}`;
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = { count: 0, resetTime: now + windowMs };
    }

    if (store[key].count >= maxAttempts) {
      const remainingMs = Math.max(0, store[key].resetTime - now);
      const minutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
      const retryAfterSec = Math.max(1, Math.ceil(remainingMs / 1000));

      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: `Too many attempts, try again in ${minutes} minutes`,
        message: `Too many attempts, try again in ${minutes} minutes`,
      });
    }

    store[key].count += 1;

    // skipSuccessfulRequests: true
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (store[key] && store[key].count > 0) {
          store[key].count -= 1;
        }
      }
    });

    next();
  };

  limiter.clear = () => {
    for (const k of Object.keys(store)) {
      delete store[k];
    }
  };

  return limiter;
};

/**
 * check-username rate limiter: 60 per minute per IP.
 * Multiplied by 10 in non-production.
 */
export const createCheckUsernameLimiter = () => {
  const windowMs = 60 * 1000;
  const baseMax = 60;
  const store: RateLimitStore = {};

  const limiter = (req: Request, res: Response, next: NextFunction) => {
    if (!isRateLimitEnabled()) {
      return next();
    }

    const maxAttempts = baseMax * getMultiplier();
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    const now = Date.now();

    if (!store[ip] || now > store[ip].resetTime) {
      store[ip] = { count: 0, resetTime: now + windowMs };
    }

    if (store[ip].count >= maxAttempts) {
      const remainingMs = Math.max(0, store[ip].resetTime - now);
      const minutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));
      const retryAfterSec = Math.max(1, Math.ceil(remainingMs / 1000));

      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: `Too many attempts, try again in ${minutes} minutes`,
        message: `Too many attempts, try again in ${minutes} minutes`,
      });
    }

    store[ip].count += 1;
    next();
  };

  limiter.clear = () => {
    for (const k of Object.keys(store)) {
      delete store[k];
    }
  };

  return limiter;
};

export const createRateLimiter = (optionsOrMax: number | { windowMs?: number; max?: number; message?: string }, windowMsArg?: number) => {
  let maxRequests = 100;
  let windowMs = 15 * 60 * 1000;
  let customMsg = 'Too many requests, please try again later';

  if (typeof optionsOrMax === 'number') {
    maxRequests = optionsOrMax;
    windowMs = windowMsArg || 15 * 60 * 1000;
  } else if (optionsOrMax && typeof optionsOrMax === 'object') {
    maxRequests = optionsOrMax.max || 100;
    windowMs = optionsOrMax.windowMs || 15 * 60 * 1000;
    if (optionsOrMax.message) customMsg = optionsOrMax.message;
  }

  const store: RateLimitStore = {};

  return (req: Request, res: Response, next: NextFunction) => {
    if (!isRateLimitEnabled()) return next();
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    const now = Date.now();

    if (!store[ip] || now > store[ip].resetTime) {
      store[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    store[ip].count += 1;
    if (store[ip].count > maxRequests * getMultiplier()) {
      const remainingMs = Math.max(0, store[ip].resetTime - now);
      const retryAfterSec = Math.max(1, Math.ceil(remainingMs / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ success: false, error: customMsg, message: customMsg });
    }

    next();
  };
};

export const createUserRateLimiter = (options: {
  max: number;
  windowMs: number;
  message: string;
  countOnlyStatus?: number;
}) => {
  const store: RateLimitStore = {};

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    if (!isRateLimitEnabled()) return next();
    const userId = (req as any).user?.userId || (req as any).user?.id;
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    const key = userId ? `user:${userId}` : `ip:${ip}`;
    const now = Date.now();

    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }

    const effectiveMax = options.max * getMultiplier();

    if (options.countOnlyStatus !== undefined) {
      if (store[key] && store[key].count >= effectiveMax) {
        const remainingMs = Math.max(0, store[key].resetTime - now);
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil(remainingMs / 1000))));
        return res.status(429).json({ success: false, error: options.message, message: options.message });
      }
      res.on('finish', () => {
        if (res.statusCode === options.countOnlyStatus) {
          const finishNow = Date.now();
          if (!store[key] || finishNow > store[key].resetTime) {
            store[key] = { count: 1, resetTime: finishNow + options.windowMs };
          } else {
            store[key].count += 1;
          }
        }
      });
      return next();
    }

    if (!store[key]) {
      store[key] = { count: 1, resetTime: now + options.windowMs };
      return next();
    }

    store[key].count += 1;

    if (store[key].count > effectiveMax) {
      const remainingMs = Math.max(0, store[key].resetTime - now);
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(remainingMs / 1000))));
      return res.status(429).json({ success: false, error: options.message, message: options.message });
    }

    next();
  };

  middleware.clear = () => {
    for (const k of Object.keys(store)) {
      delete store[k];
    }
  };

  return middleware;
};

// Export individual separate limiters
export const loginRateLimiter = createAuthAttemptLimiter({ baseMax: 10, windowMs: 15 * 60 * 1000 });
export const registerRateLimiter = createAuthAttemptLimiter({ baseMax: 10, windowMs: 15 * 60 * 1000 });
export const checkUsernameRateLimiter = createCheckUsernameLimiter();
export const apiRateLimiter = createRateLimiter(300, 15 * 60 * 1000);
export const searchRateLimiter = createRateLimiter({ max: 60, windowMs: 60 * 1000, message: 'Search rate limit exceeded.' });
export const messageSendRateLimiter = createUserRateLimiter({ max: 30, windowMs: 60 * 1000, message: 'Message rate limit exceeded.' });
export const directConversationRateLimiter = createUserRateLimiter({ max: 10, windowMs: 24 * 60 * 60 * 1000, message: 'Daily direct conversation limit reached.', countOnlyStatus: 201 });
export const conversationStartRateLimiter = directConversationRateLimiter;
export const approachRateLimiter = createUserRateLimiter({ max: 5, windowMs: 24 * 60 * 60 * 1000, message: 'Daily approach limit reached.', countOnlyStatus: 201 });
