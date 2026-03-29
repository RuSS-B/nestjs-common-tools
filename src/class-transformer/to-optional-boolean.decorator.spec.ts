import { plainToInstance, Transform } from 'class-transformer';
import {
  parseOptionalBooleanTransformer,
  ToOptionalBoolean,
} from './to-optional-boolean.decorator';

describe('ToOptionalBoolean', () => {
  it('should convert true and false strings to booleans', () => {
    const dto = plainToInstance(FiltersDto, {
      enabled: 'true',
      archived: 'false',
    });

    expect(dto.enabled).toBe(true);
    expect(dto.archived).toBe(false);
  });

  it('should trim and normalize boolean strings', () => {
    const dto = plainToInstance(FiltersDto, {
      enabled: ' TRUE ',
      archived: ' False ',
    });

    expect(dto.enabled).toBe(true);
    expect(dto.archived).toBe(false);
  });

  it('should keep unsupported values unchanged', () => {
    const dto = plainToInstance(FiltersDto, {
      enabled: 'yes',
      archived: 1,
    });

    expect(dto.enabled).toBe('yes');
    expect(dto.archived).toBe(1);
  });

  it('should keep undefined values unchanged', () => {
    const dto = plainToInstance(FiltersDto, {});

    expect(dto.enabled).toBeUndefined();
  });
});

describe('parseOptionalBooleanTransformer', () => {
  it('should work as a raw class-transformer callback', () => {
    const dto = plainToInstance(RawFiltersDto, {
      enabled: ' true ',
    });

    expect(dto.enabled).toBe(true);
  });
});

class FiltersDto {
  @ToOptionalBoolean()
  enabled?: boolean;

  @ToOptionalBoolean()
  archived?: boolean | unknown;
}

class RawFiltersDto {
  @Transform(parseOptionalBooleanTransformer)
  enabled?: boolean;
}
