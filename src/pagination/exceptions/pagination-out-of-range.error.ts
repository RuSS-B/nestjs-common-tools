const DEFAULT_MESSAGE = 'Page is out of range';

export const PAGINATION_OUT_OF_RANGE = 'PAGINATION_OUT_OF_RANGE';

export class PaginationOutOfRangeError extends Error {
  readonly code = PAGINATION_OUT_OF_RANGE;

  constructor(message: string = DEFAULT_MESSAGE) {
    super(message);
    this.name = 'PaginationOutOfRangeError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OutOfRangeException extends PaginationOutOfRangeError {
  constructor(message: string = DEFAULT_MESSAGE) {
    super(message);
    this.name = 'OutOfRangeException';
  }
}
