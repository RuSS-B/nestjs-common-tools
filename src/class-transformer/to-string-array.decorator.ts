import { Transform, TransformFnParams } from 'class-transformer';

export function ToStringArray(): PropertyDecorator {
  return Transform(({ value }: TransformFnParams) => normalizeToStringArray(value));
}

function normalizeToStringArray(value: unknown): unknown {
  if (typeof value === 'string') {
    return splitAndTrim(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      typeof item === 'string' ? splitAndTrim(item) : [],
    );
  }

  return value;
}

function splitAndTrim(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
