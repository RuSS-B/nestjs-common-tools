import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import {
  createZodValidationErrorResponse,
  ZodValidationErrorResponseOptions,
} from './zod-validation-error-response';

@Catch(ZodError)
export class ZodFastifyExceptionFilter implements ExceptionFilter<ZodError> {
  constructor(
    private readonly options: ZodValidationErrorResponseOptions = {},
  ) {}

  catch(exception: ZodError, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const response = host.switchToHttp().getResponse<FastifyReply>();

    response
      .code(HttpStatus.BAD_REQUEST)
      .send(createZodValidationErrorResponse(exception, this.options));
  }
}
