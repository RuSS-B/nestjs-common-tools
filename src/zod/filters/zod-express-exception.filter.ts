import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ZodError } from 'zod';
import {
  createZodValidationErrorResponse,
  ZodValidationErrorResponseOptions,
} from './zod-validation-error-response';

@Catch(ZodError)
export class ZodExpressExceptionFilter implements ExceptionFilter<ZodError> {
  constructor(
    private readonly options: ZodValidationErrorResponseOptions = {},
  ) {}

  catch(exception: ZodError, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const response = host.switchToHttp().getResponse<Response>();

    response
      .status(HttpStatus.BAD_REQUEST)
      .json(createZodValidationErrorResponse(exception, this.options));
  }
}
