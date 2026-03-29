import { Transform, TransformFnParams } from 'class-transformer';

export function ToBooleanFromString(): PropertyDecorator {
  return Transform(parseBooleanFromStringTransformer);
}

export const parseBooleanFromStringTransformer = ({
  value,
}: TransformFnParams): unknown => normalizeBooleanFromString(value);

function normalizeBooleanFromString(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  return value;
}
