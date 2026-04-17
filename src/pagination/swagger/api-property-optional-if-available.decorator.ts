interface SwaggerApiPropertyOptions {
  default?: unknown;
  description?: string;
  enum?: object;
  example?: unknown;
  format?: string;
  maximum?: number;
  minimum?: number;
  type?: 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string';
}

type SwaggerApiPropertyOptionalDecorator = (
  options?: SwaggerApiPropertyOptions,
) => PropertyDecorator;

function loadApiPropertyOptionalDecorator():
  | SwaggerApiPropertyOptionalDecorator
  | undefined {
  try {
    const swaggerModule = require('@nestjs/swagger') as {
      ApiPropertyOptional?: SwaggerApiPropertyOptionalDecorator;
    };

    return swaggerModule.ApiPropertyOptional;
  } catch {
    return undefined;
  }
}

export function ApiPropertyOptionalIfAvailable(
  options?: SwaggerApiPropertyOptions,
): PropertyDecorator {
  const apiPropertyOptional = loadApiPropertyOptionalDecorator();

  if (!apiPropertyOptional) {
    return () => undefined;
  }

  return apiPropertyOptional(options);
}
