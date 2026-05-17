import { Transform, TransformFnParams } from 'class-transformer';

export function ToOptionalNumber(): PropertyDecorator {
  return Transform(parseOptionalNumberTransformer);
}

export const parseOptionalNumberTransformer = ({
  value,
}: TransformFnParams): unknown => normalizeOptionalNumber(value);

function normalizeOptionalNumber(value: unknown): unknown {
  if (value === null) {
    return null;
  }

  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();

    return trimmedValue === '' ? undefined : Number(trimmedValue);
  }

  if (typeof value === 'number') {
    return value;
  }

  return Number.NaN;
}
