import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';
import { AppError } from '../errors/AppError.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors);
  }

  if (err.name === 'ZodError') {
    const formattedErrors = err.errors.map((e: any) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation failed', 400, formattedErrors);
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return sendError(res, err.message, 400);
  }

  if (err.code === 'P2002') {
    console.error('[Prisma P2002 Error]:', err);
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(',')
      : String(err.meta?.target || err.message || '');
    if (target.includes('username') || target.includes('publicSlug')) {
      return sendError(res, 'Username already taken', 409);
    }
    if (target.includes('email')) {
      return sendError(res, 'Email already in use. Please sign in.', 409);
    }
    return sendError(res, 'A record with these details already exists.', 409);
  }

  if (err.name?.startsWith('Prisma') || (err.message && err.message.includes('prisma.'))) {
    console.error('[Prisma Error]:', err);
    return sendError(res, 'A database error occurred. Please try again.', 500);
  }

  // Hide internal error details and stack trace in production responses
  const statusCode = err.statusCode || 500;
  if (statusCode === 500) {
    console.error('[Server Error]:', err);
  }
  const message = statusCode === 500 ? 'Internal Server Error' : (err.message || 'An error occurred');

  return sendError(res, message, statusCode);
};


