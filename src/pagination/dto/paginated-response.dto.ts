import { Exclude, Expose, Type } from 'class-transformer';
import {
  LegacyPaginatedResponse,
  LegacyPaginationMeta,
  PaginatedResponse,
  PaginationMeta,
} from '../interfaces/pagination.interface';

@Exclude()
class PaginationMetaDto implements PaginationMeta {
  @Expose()
  total: number;

  @Expose()
  pages: number;

  @Expose()
  page: number;

  @Expose()
  perPage: number;
}

@Exclude()
class LegacyPaginationMetaDto implements LegacyPaginationMeta {
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
export class PaginationResponseDto<T> implements PaginatedResponse<T> {
  @Expose()
  @Type(() => PaginationMetaDto)
  pagination: PaginationMetaDto;

  @Expose()
  data: T[];
}

@Exclude()
export class LegacyPaginatedResponseDto<T>
  implements LegacyPaginatedResponse<T>
{
  @Expose()
  @Type(() => LegacyPaginationMetaDto)
  pagination: LegacyPaginationMetaDto;

  @Expose()
  data: T[];
}

/**
 * @deprecated This DTO preserves the legacy pagination shape
 * (`totalItems` / `totalPages`).
 * Use PaginationResponseDto for the standard contract or
 * LegacyPaginatedResponseDto when you explicitly need the legacy contract.
 */
export class PaginatedResponseDto<T> extends LegacyPaginatedResponseDto<T> {}
