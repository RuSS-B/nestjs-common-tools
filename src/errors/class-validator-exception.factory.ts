import { BadRequestException, HttpStatus } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { API_ERROR_ROOT_FIELD } from './api-error-root-field.constant';
import { ApiErrorCode } from './api-error-code.enum';
import type { ApiErrorItem } from './api-error-response.type';
import { createApiErrorResponse } from './error-response.factory';

export interface ClassValidatorExceptionFactoryOptions {
  message?: string;
}

const DEFAULT_VALIDATION_ERROR_MESSAGE = 'Validation failed';

export function classValidatorExceptionFactory(
  errors: ValidationError[],
  options: ClassValidatorExceptionFactoryOptions = {},
): BadRequestException {
  return new BadRequestException(
    createApiErrorResponse({
      statusCode: HttpStatus.BAD_REQUEST,
      message: options.message ?? DEFAULT_VALIDATION_ERROR_MESSAGE,
      code: ApiErrorCode.VALIDATION_FAILED,
      errors: flattenValidationErrors(errors),
    }),
  );
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath?: string,
): ApiErrorItem[] {
  const items: ApiErrorItem[] = [];

  for (const error of errors) {
    const field = formatValidationErrorPath(error.property, parentPath);

    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        items.push({ field, message });
      }
    }

    if (error.children?.length) {
      items.push(...flattenValidationErrors(error.children, field));
    }
  }

  return items;
}

function formatValidationErrorPath(
  property: string | undefined,
  parentPath?: string,
): string {
  if (!property) {
    return parentPath ?? API_ERROR_ROOT_FIELD;
  }

  return parentPath ? `${parentPath}.${property}` : property;
}
