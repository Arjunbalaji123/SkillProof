import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API Error Stack:', err);

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

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, message, statusCode);
};

