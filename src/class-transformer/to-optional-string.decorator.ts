import { Transform, TransformFnParams } from 'class-transformer';

export function ToOptionalString(): PropertyDecorator {
  return Transform(normalizeOptionalStringTransformer);
}

export const normalizeOptionalStringTransformer = ({
  value,
}: TransformFnParams): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === '' ? undefined : trimmedValue;
};
