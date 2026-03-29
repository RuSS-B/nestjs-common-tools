import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { DriverError } from '../types';

type ConstraintHandler = (error: DriverError) => HttpException;

interface TypeOrmExceptionFilterOptions {
  constraints?: Record<string, ConstraintHandler>;
}

@Catch(QueryFailedError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  constructor(private readonly options: TypeOrmExceptionFilterOptions = {}) {}

  catch(exception: QueryFailedError, host: ArgumentsHost): never {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const error = exception.driverError as DriverError;
    const constraint = error.constraint;

    if (constraint && this.options.constraints?.[constraint]) {
      throw this.options.constraints[constraint](error);
    }

    const code = String(error.code ?? error.errno ?? '');

    switch (code) {
      case '1062':
      case '23505':
        throw new ConflictException('Unique constraint violation');
      case '1451':
      case '1452':
      case '23503':
        throw new BadRequestException('Foreign key constraint violation');
      case '23502':
        throw new BadRequestException('Required field is missing');
      case '23514':
        throw new BadRequestException('Check constraint violation');
      case '22P02':
        throw new BadRequestException('Invalid input format');
      default:
        throw exception;
    }
  }
}
