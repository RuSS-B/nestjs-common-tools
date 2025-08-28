import { BadRequestException } from '@nestjs/common';
import {
  CountableResponse,
  IPaginatedResponse,
  IPaginationParams,
  IPaginationRequestParams,
  PaginatedResponse,
} from './interfaces/pagination.interface';
import { OutOfRangeException } from './exceptions/out-of-range.exception';

export abstract class Pagination {
  static paginationParams(page: number, perPage: number): IPaginationParams {
    return { perPage, offset: Pagination.offset(page, perPage) };
  }

  static offset(page: number, perPage: number): number {
    return (page - 1) * perPage;
  }

  static createResponse<T>(
    { page, perPage }: IPaginationRequestParams,
    [data, total]: CountableResponse<T>,
  ): PaginatedResponse<T> {
    const pages = Math.ceil(total / perPage);

    if (page > pages && pages > 0) {
      throw new OutOfRangeException();
    }

    return {
      data,
      pagination: {
        total,
        pages,
        perPage,
        page,
      },
    };
  }

  /**
   * @Deprecated: Switch to createResponse instead
   */
  static response<T>(
    { page, perPage }: IPaginationRequestParams,
    [data, total]: CountableResponse<T>,
  ): IPaginatedResponse<T> {
    const totalPages = Math.ceil(total / perPage);

    if (page > totalPages && totalPages > 0) {
      throw new BadRequestException('Page is out of range');
    }

    return {
      data,
      pagination: {
        totalItems: total,
        totalPages,
        perPage,
        page,
      },
    };
  }
}
