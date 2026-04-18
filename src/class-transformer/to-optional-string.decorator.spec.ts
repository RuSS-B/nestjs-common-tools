import { plainToInstance, Transform } from 'class-transformer';
import {
  normalizeOptionalStringTransformer,
  ToOptionalString,
} from './to-optional-string.decorator';

describe('ToOptionalString', () => {
  it('should trim non-empty strings', () => {
    const dto = plainToInstance(FiltersDto, {
      search: '  active  ',
    });

    expect(dto.search).toBe('active');
  });

  it('should convert empty and blank strings to undefined', () => {
    const dto = plainToInstance(FiltersDto, {
      search: '   ',
      alias: '',
    });

    expect(dto.search).toBeUndefined();
    expect(dto.alias).toBeUndefined();
  });

  it('should keep non-string values unchanged', () => {
    const dto = plainToInstance(FiltersDto, {
      search: 0,
      alias: false,
    });

    expect(dto.search).toBe(0);
    expect(dto.alias).toBe(false);
  });

  it('should keep undefined values unchanged', () => {
    const dto = plainToInstance(FiltersDto, {});

    expect(dto.search).toBeUndefined();
  });
});

describe('normalizeOptionalStringTransformer', () => {
  it('should work as a raw class-transformer callback', () => {
    const dto = plainToInstance(RawFiltersDto, {
      search: '  active  ',
      alias: '   ',
    });

    expect(dto.search).toBe('active');
    expect(dto.alias).toBeUndefined();
  });
});

class FiltersDto {
  @ToOptionalString()
  search?: string | unknown;

  @ToOptionalString()
  alias?: string | unknown;
}

class RawFiltersDto {
  @Transform(normalizeOptionalStringTransformer)
  search?: string;

  @Transform(normalizeOptionalStringTransformer)
  alias?: string;
}
