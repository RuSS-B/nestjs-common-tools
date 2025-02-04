import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { status } from '@grpc/grpc-js';
import { throwError } from 'rxjs';

interface IError {
  code: number,
  message: string
}

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    if (host.getType() !== 'rpc') {
      return;
    }

    const errno = (exception as any).errno || +(exception as any).code;
    const error = this.getError(errno);
    return throwError(() => ({
      code: error?.code || 500,
      message: error?.message || exception.message,
    }));
  }

  private getError(code: number): IError | undefined {
    const errorMapping: Record<number, IError> = {
      23505: {
        code: status.ALREADY_EXISTS,
        message: 'A record with these unique constraints already exists',
      },
      1062: {
        code: status.ALREADY_EXISTS,
        message: 'A record with these unique constraints already exists',
      },
      1451: {
        code: status.ALREADY_EXISTS,
        message:
          'Cannot delete or update a parent row: a foreign key constraint fails',
      },
      1452: {
        code: status.INVALID_ARGUMENT,
        message:
          'Cannot add or update a child row: a foreign key constraint fails',
      },
    };

    return errorMapping[code];
  }
}
