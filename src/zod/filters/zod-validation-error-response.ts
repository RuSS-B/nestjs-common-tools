import { HttpStatus } from '@nestjs/common';
import type { ZodError } from 'zod';

export interface ZodValidationError {
  field?: string;
  message: string;
}

export interface ZodValidationErrorResponse {
  statusCode: HttpStatus.BAD_REQUEST;
  message: string;
  errors: ZodValidationError[];
}

export interface ZodValidationErrorResponseOptions {
  message?: string;
}

const DEFAULT_ZOD_VALIDATION_ERROR_MESSAGE = 'Validation failed';

export function createZodValidationErrorResponse(
  exception: ZodError,
  options: ZodValidationErrorResponseOptions = {},
): ZodValidationErrorResponse {
  return {
    statusCode: HttpStatus.BAD_REQUEST,
    message: options.message ?? DEFAULT_ZOD_VALIDATION_ERROR_MESSAGE,
    errors: exception.issues.map((issue) => {
      const field = formatZodIssuePath(issue.path);

      return {
        ...(field ? { field } : {}),
        message: issue.message,
      };
    }),
  };
}

function formatZodIssuePath(path: readonly PropertyKey[]): string | undefined {
  if (path.length === 0) {
    return undefined;
  }

  return path.map(String).join('.');
}
