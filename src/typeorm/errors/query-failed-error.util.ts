import { QueryFailedError } from 'typeorm';
import { DriverError } from '../types';

type MatchValue<T> = T | readonly T[];

export type QueryFailedErrorCriteria = {
  [K in keyof DriverError]?: MatchValue<NonNullable<DriverError[K]>>;
};

export type TypeOrmQueryFailedError = QueryFailedError<Error & DriverError> &
  Partial<DriverError>;

export function isTypeOrmQueryFailedError(
  error: unknown,
  criteria?: QueryFailedErrorCriteria,
): error is TypeOrmQueryFailedError {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  if (!criteria) {
    return true;
  }

  return (Object.keys(criteria) as Array<keyof DriverError>).every((key) => {
    const expected = criteria[key];

    if (expected === undefined) {
      return true;
    }

    const actual = getDriverErrorValue(error, key);
    const acceptedValues = Array.isArray(expected) ? expected : [expected];

    return acceptedValues.some((value) => value === actual);
  });
}

function getDriverErrorValue<K extends keyof DriverError>(
  error: TypeOrmQueryFailedError,
  key: K,
): DriverError[K] | undefined {
  const driverError = error.driverError as Partial<DriverError>;
  const queryFailedError = error as Partial<DriverError>;

  return driverError[key] ?? queryFailedError[key];
}
