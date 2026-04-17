import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  PaginatedRequestDto,
  SortOrder,
  SortablePaginatedRequestDto,
} from '../index';

describe('pagination request dto', () => {
  it('should coerce page and perPage to numbers', () => {
    const dto = plainToInstance(PaginatedRequestDto, {
      page: '2',
      perPage: '25',
    });

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.perPage).toBe(25);
    expect(dto.offset).toBe(25);
  });

  it('should reject page and perPage outside the allowed range', () => {
    const dto = plainToInstance(PaginatedRequestDto, {
      page: 0,
      perPage: 1001,
    });
    const errors = validateSync(dto);

    expect(errors).toHaveLength(2);
    expect(errors.map(({ property }) => property)).toEqual(
      expect.arrayContaining(['page', 'perPage']),
    );
  });
});

describe('sortable paginated request dto', () => {
  it('should accept supported sort orders', () => {
    const dto = plainToInstance(SortablePaginatedRequestDto, {
      sortOrder: SortOrder.ASC,
    });

    expect(validateSync(dto)).toHaveLength(0);
  });

  it('should reject unsupported sort orders', () => {
    const dto = plainToInstance(SortablePaginatedRequestDto, {
      sortOrder: 'up',
    });
    const errors = validateSync(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0]?.property).toBe('sortOrder');
  });
});
