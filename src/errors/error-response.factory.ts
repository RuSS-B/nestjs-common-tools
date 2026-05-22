import { HttpStatus } from '@nestjs/common';
import { ApiErrorCode } from './api-error-code.enum';
import type { ApiErrorItem, ApiErrorResponse } from './api-error-response.type';

const HTTP_ERROR_LABELS: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

const DEFAULT_ERROR_CODES: Record<number, ApiErrorCode> = {
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ApiErrorCode.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ApiErrorCode.UNPROCESSABLE_ENTITY,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.TOO_MANY_REQUESTS,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ApiErrorCode.INTERNAL_SERVER_ERROR,
};

export type CreateApiErrorResponseParams = {
  statusCode: number;
  message?: string;
  code?: ApiErrorCode | string;
  error?: string;
  errors?: ApiErrorItem[];
};

export function createApiErrorResponse(
  params: CreateApiErrorResponseParams,
): ApiErrorResponse {
  const error = params.error ?? HTTP_ERROR_LABELS[params.statusCode] ?? 'Error';
  const message = params.message ?? error;
  const code = params.code ?? DEFAULT_ERROR_CODES[params.statusCode] ?? 'ERROR';

  if (!params.errors?.length) {
    return {
      statusCode: params.statusCode,
      error,
      message,
      code,
    };
  }

  return {
    statusCode: params.statusCode,
    error,
    message,
    code,
    errors: params.errors,
  };
}
