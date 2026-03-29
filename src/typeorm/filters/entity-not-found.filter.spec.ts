import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { EntityNotFoundError } from 'typeorm';
import { EntityNotFoundFilter } from './entity-not-found.filter';

describe('EntityNotFoundFilter', () => {
  it('should map EntityNotFoundError to NotFoundException for http requests', () => {
    const filter = new EntityNotFoundFilter();
    const exception = createEntityNotFoundError();
    const host = createArgumentsHost('http');

    expect(() => filter.catch(exception, host)).toThrow(NotFoundException);
    expect(() => filter.catch(exception, host)).toThrow('Entity not found');
  });

  it('should rethrow the original error for non-http requests', () => {
    const filter = new EntityNotFoundFilter();
    const exception = createEntityNotFoundError();
    const host = createArgumentsHost('rpc');

    expect(() => filter.catch(exception, host)).toThrow(exception);
  });
});

function createEntityNotFoundError(): EntityNotFoundError {
  return new EntityNotFoundError('UserEntity', { id: 1 });
}

function createArgumentsHost(type: 'http' | 'rpc'): ArgumentsHost {
  return {
    getType: () => type,
  } as ArgumentsHost;
}
