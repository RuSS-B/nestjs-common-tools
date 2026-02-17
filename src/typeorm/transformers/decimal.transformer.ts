import { ValueTransformer } from 'typeorm';

export const decimalTransformer: ValueTransformer = {
  from(value: string | null): number | null {
    return value === null ? null : +value;
  },
  to(value: string | null): string | null {
    return value;
  },
};
