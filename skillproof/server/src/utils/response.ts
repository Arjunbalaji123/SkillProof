import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  meta?: any;
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  meta?: any
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    meta,
  });
};

export const formatFriendlyError = (
  rawMessage: string | any,
  defaultStatusCode: number = 400
): { message: string; statusCode: number } => {
  const msg =
    typeof rawMessage === 'string'
      ? rawMessage
      : rawMessage?.message || 'An unexpected error occurred';

  const isRawPrismaError =
    msg.includes('prisma.') ||
    msg.includes('PrismaClient') ||
    msg.includes('Unique constraint failed') ||
    msg.includes('Foreign key constraint failed') ||
    msg.includes('Invalid `prisma.');

  if (isRawPrismaError) {
    console.error('[Server Prisma Error]:', msg);

    if (msg.includes('Unique constraint failed')) {
      if (msg.includes('username')) {
        return { message: 'Username already taken', statusCode: 409 };
      }
      if (msg.includes('email')) {
        return { message: 'Email already in use. Please sign in.', statusCode: 409 };
      }
      return { message: 'A record with these details already exists.', statusCode: 409 };
    }

    return {
      message: 'A database error occurred. Please try again.',
      statusCode: defaultStatusCode >= 400 && defaultStatusCode !== 400 ? defaultStatusCode : 500,
    };
  }

  return { message: msg, statusCode: defaultStatusCode };
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 400,
  errors: any[] = []
) => {
  const sanitized = formatFriendlyError(message, statusCode);
  return res.status(sanitized.statusCode).json({
    success: false,
    message: sanitized.message,
    errors,
  });
};


