import { BadRequestException } from '@nestjs/common';
import {
  CountableResponse,
  LegacyPaginatedResponse,
  LegacyPaginationMeta,
  PaginatedResponse,
  PaginationMeta,
  PaginationParams,
  PaginationRequest,
} from './interfaces/pagination.interface';
import { OutOfRangeException, PaginationOutOfRangeError } from './exceptions';

export abstract class Pagination {
  static params(page: number, perPage: number): PaginationParams {
    return { perPage, offset: Pagination.offset(page, perPage) };
  }

  /**
   * @deprecated Use params instead.
   */
  static paginationParams(page: number, perPage: number): PaginationParams {
    return Pagination.params(page, perPage);
  }

  static offset(page: number, perPage: number): number {
    return (page - 1) * perPage;
  }

  static createResponse<T>(
    { page, perPage }: PaginationRequest,
    [data, total]: CountableResponse<T>,
  ): PaginatedResponse<T> {
    return {
      data,
      pagination: Pagination.createMeta(page, perPage, total),
    };
  }

  static createLegacyResponse<T>(
    { page, perPage }: PaginationRequest,
    [data, total]: CountableResponse<T>,
  ): LegacyPaginatedResponse<T> {
    return {
      data,
      pagination: Pagination.createLegacyMeta(
        Pagination.createMeta(page, perPage, total),
      ),
    };
  }

  /**
   * @deprecated Use createLegacyResponse instead.
   */
  static response<T>(
    pagination: PaginationRequest,
    result: CountableResponse<T>,
  ): LegacyPaginatedResponse<T> {
    try {
      return Pagination.createLegacyResponse(pagination, result);
    } catch (error) {
      if (error instanceof PaginationOutOfRangeError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private static createMeta(
    page: number,
    perPage: number,
    total: number,
  ): PaginationMeta {
    const pages = Math.ceil(total / perPage);

    if (page > pages && pages > 0) {
      throw new OutOfRangeException();
    }

    return {
      total,
      pages,
      perPage,
      page,
    };
  }

  private static createLegacyMeta({
    total,
    pages,
    page,
    perPage,
  }: PaginationMeta): LegacyPaginationMeta {
    return {
      totalItems: total,
      totalPages: pages,
      perPage,
      page,
    };
  }
}
