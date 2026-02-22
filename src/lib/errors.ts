/**
 * API용 커스텀 에러 클래스
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
  constructor(message = '인증이 필요합니다', hint: string | null = null) {
    super(message, 401, 'UNAUTHORIZED', hint);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = '접근이 거부되었습니다', hint: string | null = null) {
    super(message, 403, 'FORBIDDEN', hint);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = '리소스', hint: string | null = null) {
    super(`${resource}을(를) 찾을 수 없습니다`, 404, 'NOT_FOUND', hint);
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

  constructor(message = '요청 한도를 초과했습니다', retryAfter = 60) {
    super(message, 429, 'RATE_LIMITED', `${retryAfter}초 후에 다시 시도해주세요`);
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
    super('유효성 검사에 실패했습니다', 400, 'VALIDATION_ERROR');
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
  constructor(message = '내부 서버 오류가 발생했습니다') {
    super(message, 500, 'INTERNAL_ERROR', '잠시 후 다시 시도해주세요');
    this.name = 'InternalError';
  }
}
