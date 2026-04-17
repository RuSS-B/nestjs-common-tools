import { IsEnum, IsOptional } from 'class-validator';
import { PaginatedRequestDto } from './paginated-request.dto';
import { ApiPropertyOptionalIfAvailable } from '../swagger/api-property-optional-if-available.decorator';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class SortablePaginatedRequestDto extends PaginatedRequestDto {
  @ApiPropertyOptionalIfAvailable({
    enum: SortOrder,
    example: SortOrder.ASC,
    description: 'Sort direction for the requested collection.',
  })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}
