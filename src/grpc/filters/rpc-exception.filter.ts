import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';

@Catch(RpcException)
export class RpcExceptionFilter implements ExceptionFilter {
  private logger = new Logger(this.constructor.name);

  catch(exception: RpcException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const error: any = exception.getError();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Map gRPC status codes to HTTP status codes
    switch (error.code) {
      case 1:
        break;
      case 3: // INVALID_ARGUMENT
        status = HttpStatus.BAD_REQUEST;
        break;
      case 5: // NOT_FOUND
        status = HttpStatus.NOT_FOUND;
        break;
      case 7: // PERMISSION_DENIED
        status = HttpStatus.FORBIDDEN;
        break;
      case 12: // UNAVAILABLE
        status = HttpStatus.NOT_IMPLEMENTED;
        break;
      case 16: // UNAUTHENTICATED
        status = HttpStatus.UNAUTHORIZED;
        break;
      default:
        this.logger.error(error);
    }

    message = error.message || message;

    let details = '';
    try {
      details = JSON.parse(error.details)['error'];
    } catch (e) {
      details = error.details;
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      error: HttpStatus[status],
      details: details,
    });
  }
}
