import { plainToInstance } from 'class-transformer';
import { ToStringArray } from './to-string-array.decorator';

describe('ToStringArray', () => {
  it('should split a comma-delimited string into a trimmed array', () => {
    const dto = plainToInstance(FiltersDto, {
      tags: 'cars, bikes, boats',
    });

    expect(dto.tags).toEqual(['cars', 'bikes', 'boats']);
  });

  it('should trim and filter empty items from array input', () => {
    const dto = plainToInstance(FiltersDto, {
      tags: [' cars ', 'bikes, boats', ' ', ''],
    });

    expect(dto.tags).toEqual(['cars', 'bikes', 'boats']);
  });

  it('should keep undefined values unchanged', () => {
    const dto = plainToInstance(FiltersDto, {});

    expect(dto.tags).toBeUndefined();
  });
});

class FiltersDto {
  @ToStringArray()
  tags?: string[];
}
