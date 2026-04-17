import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import {
  PaginationParams,
  PaginationRequest,
} from '../interfaces/pagination.interface';
import { ApiPropertyOptionalIfAvailable } from '../swagger/api-property-optional-if-available.decorator';

export class PaginatedRequestDto implements PaginationRequest {
  @ApiPropertyOptionalIfAvailable({
    type: 'integer',
    example: 1,
    default: 1,
    minimum: 1,
    description: 'Page number starting from 1.',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptionalIfAvailable({
    type: 'integer',
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 1000,
    description: 'Number of items to return per page.',
  })
  @IsOptional()
  @IsNumber()
  @Max(1000)
  @Min(1)
  @Type(() => Number)
  perPage: number = 50;

  get offset(): number {
    return (this.page - 1) * this.perPage;
  }

  getParams(): PaginationParams {
    return {
      perPage: this.perPage,
      offset: this.offset,
    };
  }
}
