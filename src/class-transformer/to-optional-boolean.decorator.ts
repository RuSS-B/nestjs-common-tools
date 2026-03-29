import { Transform, TransformFnParams } from 'class-transformer';

export function ToOptionalBoolean(): PropertyDecorator {
  return Transform(parseOptionalBooleanTransformer);
}

export const parseOptionalBooleanTransformer = ({
  value,
}: TransformFnParams): unknown => normalizeOptionalBoolean(value);

function normalizeOptionalBoolean(value: unknown): unknown {
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
