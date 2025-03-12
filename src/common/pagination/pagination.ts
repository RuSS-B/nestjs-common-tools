import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { BadRequestException } from '@nestjs/common';
import {
  CountableResponse,
  IPaginationRequestParams,
} from './interfaces/pagination.interface';

export abstract class Pagination {
  static response<T>(
    { page, perPage }: IPaginationRequestParams,
    [data, total]: CountableResponse<T>,
  ): PaginatedResponseDto<T> {
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
