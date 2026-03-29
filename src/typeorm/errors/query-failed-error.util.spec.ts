import { QueryFailedError } from 'typeorm';
import { DriverError } from '../types';
import { isTypeOrmQueryFailedError } from './query-failed-error.util';

describe('isTypeOrmQueryFailedError', () => {
  it('should return false for non-QueryFailedError values', () => {
    expect(isTypeOrmQueryFailedError(new Error('boom'))).toBe(false);
    expect(isTypeOrmQueryFailedError(null)).toBe(false);
  });

  it('should work as a plain type guard without criteria', () => {
    const error = createQueryFailedError({
      code: '23505',
      constraint: 'users_email_key',
    });

    expect(isTypeOrmQueryFailedError(error)).toBe(true);
  });

  it('should match a single driver error property', () => {
    const error = createQueryFailedError({
      code: '23505',
      constraint: 'open_ticket_per_car_index',
    });

    expect(
      isTypeOrmQueryFailedError(error, {
        constraint: 'open_ticket_per_car_index',
      }),
    ).toBe(true);
  });

  it('should match multiple driver error properties at once', () => {
    const error = createQueryFailedError({
      code: '23505',
      constraint: 'open_ticket_per_car_index',
    });

    expect(
      isTypeOrmQueryFailedError(error, {
        code: '23505',
        constraint: 'open_ticket_per_car_index',
      }),
    ).toBe(true);
  });

  it('should support multiple accepted values for the same property', () => {
    const error = createQueryFailedError({
      code: '1062',
      constraint: 'users_email_key',
    });

    expect(
      isTypeOrmQueryFailedError(error, {
        code: ['1062', '23505'],
      }),
    ).toBe(true);
  });

  it('should read from driverError when the copied property is missing on the error instance', () => {
    const error = createQueryFailedError({
      code: '23505',
      constraint: 'open_ticket_per_car_index',
    });

    delete (error as Partial<DriverError>).constraint;

    expect(
      isTypeOrmQueryFailedError(error, {
        constraint: 'open_ticket_per_car_index',
      }),
    ).toBe(true);
  });

  it('should return false when any criterion does not match', () => {
    const error = createQueryFailedError({
      code: '23505',
      constraint: 'open_ticket_per_car_index',
    });

    expect(
      isTypeOrmQueryFailedError(error, {
        code: '23505',
        constraint: 'another_constraint',
      }),
    ).toBe(false);
  });
});

function createQueryFailedError(driverError: DriverError): QueryFailedError {
  return new QueryFailedError(
    'SELECT 1',
    [],
    Object.assign(new Error('Query failed'), driverError),
  );
}
