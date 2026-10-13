import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

interface RateLimitStore {
  [ip: string]: { count: number; resetTime: number };
}

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export const createRateLimiter = (optionsOrMax: number | RateLimitOptions, windowMsArg?: number) => {
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
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    const now = Date.now();

    if (!store[ip] || now > store[ip].resetTime) {
      store[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    store[ip].count += 1;

    if (store[ip].count > maxRequests) {
      return sendError(res, customMsg, 429);
    }

    next();
  };
};

export const createLoginRateLimiter = (maxAttempts = 10, windowMs = 15 * 60 * 1000) => {
  const store: RateLimitStore = {};

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    const email =
      typeof req.body?.email === 'string' && req.body.email.trim().length > 0
        ? req.body.email.trim().toLowerCase()
        : 'unknown';
    const key = `${ip}:${email}`;
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    store[key].count += 1;

    if (store[key].count > maxAttempts) {
      const remainingMs = Math.max(0, store[key].resetTime - now);
      const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
      return sendError(
        res,
        `Too many attempts, try again in ${minutes} minutes`,
        429
      );
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

export const createUserRateLimiter = (options: {
  max: number;
  windowMs: number;
  message: string;
  countOnlyStatus?: number;
}) => {
  const store: RateLimitStore = {};

  const middleware = (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.userId;
    const ip = (req.ip || req.socket.remoteAddress || 'unknown').toString();
    const key = userId ? `user:${userId}` : `ip:${ip}`;
    const now = Date.now();

    if (store[key] && now > store[key].resetTime) {
      delete store[key];
    }

    if (options.countOnlyStatus !== undefined) {
      if (store[key] && store[key].count >= options.max) {
        return sendError(res, options.message, 429);
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

    if (store[key].count > options.max) {
      return sendError(res, options.message, 429);
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

export const loginRateLimiter = createLoginRateLimiter(10, 15 * 60 * 1000); // 10 attempts per 15 mins per IP + email
export const authRateLimiter = createRateLimiter(20, 15 * 60 * 1000); // 20 requests per 15 mins
export const apiRateLimiter = createRateLimiter(300, 15 * 60 * 1000);  // 300 requests per 15 mins
export const searchRateLimiter = createRateLimiter({
  max: 60,
  windowMs: 60 * 1000,
  message: 'Search rate limit exceeded, please slow down.',
});

// Separate rate limiters for direct messaging (never reusing login or global limiters)
export const messageSendRateLimiter = createUserRateLimiter({
  max: 30,
  windowMs: 60 * 1000, // 30 messages / minute per user
  message: 'Message rate limit exceeded (max 30 messages per minute). Please slow down.',
});

export const conversationStartRateLimiter = createUserRateLimiter({
  max: 10,
  windowMs: 24 * 60 * 60 * 1000, // 10 new conversations / day per user
  message: 'Daily limit reached: You can start at most 10 new conversations per day.',
  countOnlyStatus: 201,
});


