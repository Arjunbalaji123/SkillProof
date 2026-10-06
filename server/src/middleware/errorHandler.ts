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
    return sendError(res, 'Validation error', 422, formattedErrors);
  }

  if (err.message && err.message.includes('Invalid file type')) {
    return sendError(res, err.message, 400);
  }

  // Hide internal error details and stack trace in production responses
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : (err.message || 'An error occurred');

  return sendError(res, message, statusCode);
};

