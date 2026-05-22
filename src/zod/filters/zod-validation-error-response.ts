import { HttpStatus } from '@nestjs/common';
import type { ZodError } from 'zod';
import {
  API_ERROR_ROOT_FIELD,
  ApiErrorCode,
  createApiErrorResponse,
} from '../../errors';
import type { ApiErrorItem, ApiErrorResponse } from '../../errors';

export interface ZodExceptionFilterOptions {
  message?: string;
}

const DEFAULT_VALIDATION_ERROR_MESSAGE = 'Validation failed';

export function createZodValidationErrorResponse(
  exception: ZodError,
  options: ZodExceptionFilterOptions = {},
): ApiErrorResponse {
  return createApiErrorResponse({
    statusCode: HttpStatus.BAD_REQUEST,
    message: options.message ?? DEFAULT_VALIDATION_ERROR_MESSAGE,
    code: ApiErrorCode.VALIDATION_FAILED,
    errors: exception.issues.map((issue) => ({
      field: formatZodIssuePath(issue.path),
      message: issue.message,
    })),
  });
}

function formatZodIssuePath(
  path: readonly PropertyKey[],
): ApiErrorItem['field'] {
  if (path.length === 0) {
    return API_ERROR_ROOT_FIELD;
  }

  return path.map(String).join('.');
}
