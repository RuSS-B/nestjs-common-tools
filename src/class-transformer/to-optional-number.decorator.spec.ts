import { plainToInstance, Transform } from 'class-transformer';
import {
  parseOptionalNumberTransformer,
  ToOptionalNumber,
} from './to-optional-number.decorator';

describe('ToOptionalNumber', () => {
  it('should convert numeric strings to numbers', () => {
    const dto = plainToInstance(FiltersDto, {
      page: ' 42 ',
      limit: '0',
    });

    expect(dto.page).toBe(42);
    expect(dto.limit).toBe(0);
  });

  it('should convert empty and blank strings to undefined', () => {
    const dto = plainToInstance(FiltersDto, {
      page: '   ',
      limit: '',
    });

    expect(dto.page).toBeUndefined();
    expect(dto.limit).toBeUndefined();
  });

  it('should preserve null and keep undefined as undefined', () => {
    const dto = plainToInstance(FiltersDto, {
      page: null,
    });

    expect(dto.page).toBeNull();
    expect(dto.limit).toBeUndefined();
  });

  it('should keep number values unchanged', () => {
    const dto = plainToInstance(FiltersDto, {
      page: 10,
      limit: 0,
    });

    expect(dto.page).toBe(10);
    expect(dto.limit).toBe(0);
  });

  it('should return NaN for unsupported non-number and non-string values', () => {
    const dto = plainToInstance(FiltersDto, {
      page: true,
      limit: {},
    });

    expect(dto.page).toBeNaN();
    expect(dto.limit).toBeNaN();
  });
});

describe('parseOptionalNumberTransformer', () => {
  it('should work as a raw class-transformer callback', () => {
    const dto = plainToInstance(RawFiltersDto, {
      page: ' 7 ',
      limit: '   ',
    });

    expect(dto.page).toBe(7);
    expect(dto.limit).toBeUndefined();
  });
});

class FiltersDto {
  @ToOptionalNumber()
  page?: number | unknown;

  @ToOptionalNumber()
  limit?: number | unknown;
}

class RawFiltersDto {
  @Transform(parseOptionalNumberTransformer)
  page?: number;

  @Transform(parseOptionalNumberTransformer)
  limit?: number;
}
