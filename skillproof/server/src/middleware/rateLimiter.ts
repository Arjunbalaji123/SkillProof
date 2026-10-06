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

export const authRateLimiter = createRateLimiter(20, 15 * 60 * 1000); // 20 requests per 15 mins
export const apiRateLimiter = createRateLimiter(300, 15 * 60 * 1000);  // 300 requests per 15 mins
