import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: QueryFailedError, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      return;
    }

    const errno: number = (exception as any).errno || +(exception as any).code;

    this.throwHttpError(errno);
  }

  private throwHttpError(code: number): void {
    switch (code) {
      case 1062:
      case 23505:
        throw new ConflictException(
          'A record with these unique constraint(s) already exists'
        );
      case 1451:
        throw new BadRequestException(
          'Cannot delete or update a parent row: a foreign key constraint fails'
        );
      case 1452:
        throw new BadRequestException(
          'Cannot add or update a child row: a foreign key constraint fails'
        );
    }
  }
}
