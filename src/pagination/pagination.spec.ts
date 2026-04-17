import { BadRequestException } from '@nestjs/common';
import {
  OutOfRangeException,
  PAGINATION_OUT_OF_RANGE,
  Pagination,
  PaginationOutOfRangeError,
  PaginatedRequestDto,
} from './index';

describe('Pagination', () => {
  it('should build the standard pagination response shape', () => {
    expect(
      Pagination.createResponse(
        { page: 2, perPage: 3 },
        [[1, 2, 3], 10],
      ),
    ).toEqual({
      data: [1, 2, 3],
      pagination: {
        total: 10,
        pages: 4,
        page: 2,
        perPage: 3,
      },
    });
  });

  it('should build the legacy pagination response shape', () => {
    expect(
      Pagination.createLegacyResponse(
        { page: 2, perPage: 3 },
        [[1, 2, 3], 10],
      ),
    ).toEqual({
      data: [1, 2, 3],
      pagination: {
        totalItems: 10,
        totalPages: 4,
        page: 2,
        perPage: 3,
      },
    });
  });

  it('should keep response as a legacy compatibility alias', () => {
    expect(
      Pagination.response(
        { page: 2, perPage: 3 },
        [[1, 2, 3], 10],
      ),
    ).toEqual(
      Pagination.createLegacyResponse(
        { page: 2, perPage: 3 },
        [[1, 2, 3], 10],
      ),
    );
  });

  it('should keep response throwing BadRequestException for legacy Nest callers', () => {
    expect(() =>
      Pagination.response({ page: 3, perPage: 10 }, [['a'], 11]),
    ).toThrow(BadRequestException);
  });

  it('should expose a transport-agnostic pagination error', () => {
    try {
      Pagination.createResponse({ page: 3, perPage: 10 }, [['a'], 11]);
      fail('Expected createResponse to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(OutOfRangeException);
      expect(error).toBeInstanceOf(PaginationOutOfRangeError);
      expect((error as PaginationOutOfRangeError).code).toBe(
        PAGINATION_OUT_OF_RANGE,
      );
      expect((error as Error).message).toBe('Page is out of range');
    }
  });

  it('should expose clearer params helpers without breaking the old one', () => {
    const dto = Object.assign(new PaginatedRequestDto(), {
      page: 3,
      perPage: 5,
    });

    expect(dto.offset).toBe(10);
    expect(dto.getParams()).toEqual({ offset: 10, perPage: 5 });
    expect(Pagination.params(3, 5)).toEqual({ offset: 10, perPage: 5 });
    expect(Pagination.paginationParams(3, 5)).toEqual({
      offset: 10,
      perPage: 5,
    });
  });
});
