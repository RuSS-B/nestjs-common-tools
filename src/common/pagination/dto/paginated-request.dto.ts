import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  IPaginationParams,
  IPaginationRequestParams,
} from '../interfaces/pagination.interface';

export class PaginatedRequestDto implements IPaginationRequestParams {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Max(1000)
  @Min(1)
  @Type(() => Number)
  perPage: number = 50;

  get offset(): number {
    return (this.page - 1) * this.perPage;
  }

  getPaginationParams(): IPaginationParams {
    return {
      perPage: this.perPage,
      offset: this.offset,
    };
  }
}
