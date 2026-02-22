/**
 * Custom error classes for API
 * Converted from MOLTBOOK API's errors.js
 */

export class ApiError extends Error {
  statusCode: number;
  code: string | null;
  hint: string | null;

  constructor(message: string, statusCode: number, code: string | null = null, hint: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.hint = hint;
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      hint: this.hint,
    };
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string, code = 'BAD_REQUEST', hint: string | null = null) {
    super(message, 400, code, hint);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required', hint: string | null = null) {
    super(message, 401, 'UNAUTHORIZED', hint);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Access denied', hint: string | null = null) {
    super(message, 403, 'FORBIDDEN', hint);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', hint: string | null = null) {
    super(`${resource} not found`, 404, 'NOT_FOUND', hint);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, hint: string | null = null) {
    super(message, 409, 'CONFLICT', hint);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  retryAfter: number;

  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 429, 'RATE_LIMITED', `Try again in ${retryAfter} seconds`);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
      retryAfterMinutes: Math.ceil(this.retryAfter / 60),
    };
  }
}

export class ValidationError extends ApiError {
  errors: unknown[];

  constructor(errors: unknown[]) {
    super('Validation failed', 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }
}

export class InternalError extends ApiError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', 'Please try again later');
    this.name = 'InternalError';
  }
}
