import { Exclude, Expose, Type } from 'class-transformer';
import {
  IPaginatedResponse,
  IPaginationData,
} from '../interfaces/pagination.interface';

@Exclude()
class PaginationDataDto implements IPaginationData {
  @Expose()
  totalItems: number;

  @Expose()
  totalPages: number;

  @Expose()
  page: number;

  @Expose()
  perPage: number;
}

@Exclude()
export class PaginatedResponseDto<T> implements IPaginatedResponse<T> {
  @Expose()
  @Type(() => PaginationDataDto)
  pagination: PaginationDataDto;

  @Expose()
  data: T[];
}
