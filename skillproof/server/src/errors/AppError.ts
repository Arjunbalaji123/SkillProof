export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: any;

  constructor(message: string, statusCode: number = 500, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string = 'Bad Request', errors?: any) {
    return new AppError(message, 400, errors);
  }

  static unauthorized(message: string = 'Unauthorized access') {
    return new AppError(message, 401);
  }

  static forbidden(message: string = 'Forbidden resource access') {
    return new AppError(message, 403);
  }

  static notFound(message: string = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message: string = 'Resource conflict') {
    return new AppError(message, 409);
  }

  static unprocessableEntity(message: string = 'Validation error', errors?: any) {
    return new AppError(message, 422, errors);
  }

  static tooManyRequests(message: string = 'Too many requests, please try again later') {
    return new AppError(message, 429);
  }

  static internal(message: string = 'Internal Server Error') {
    return new AppError(message, 500);
  }
}

