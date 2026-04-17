export interface OpenApiSchema {
  $ref?: string;
  allOf?: OpenApiSchema[];
  description?: string;
  example?: unknown;
  format?: string;
  items?: OpenApiSchema;
  nullable?: boolean;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  type?: 'array' | 'boolean' | 'integer' | 'number' | 'object' | 'string';
}

function createPaginationMetaSchema(): OpenApiSchema {
  return {
    type: 'object',
    required: ['total', 'pages', 'page', 'perPage'],
    properties: {
      total: {
        type: 'integer',
        example: 125,
      },
      pages: {
        type: 'integer',
        example: 13,
      },
      page: {
        type: 'integer',
        example: 1,
      },
      perPage: {
        type: 'integer',
        example: 10,
      },
    },
  };
}

function createLegacyPaginationMetaSchema(): OpenApiSchema {
  return {
    type: 'object',
    required: ['totalItems', 'totalPages', 'page', 'perPage'],
    properties: {
      totalItems: {
        type: 'integer',
        example: 125,
      },
      totalPages: {
        type: 'integer',
        example: 13,
      },
      page: {
        type: 'integer',
        example: 1,
      },
      perPage: {
        type: 'integer',
        example: 10,
      },
    },
  };
}

export function createPaginatedResponseSchema(
  itemSchema: OpenApiSchema,
): OpenApiSchema {
  return {
    type: 'object',
    required: ['data', 'pagination'],
    properties: {
      data: {
        type: 'array',
        items: itemSchema,
      },
      pagination: createPaginationMetaSchema(),
    },
  };
}

export function createLegacyPaginatedResponseSchema(
  itemSchema: OpenApiSchema,
): OpenApiSchema {
  return {
    type: 'object',
    required: ['data', 'pagination'],
    properties: {
      data: {
        type: 'array',
        items: itemSchema,
      },
      pagination: createLegacyPaginationMetaSchema(),
    },
  };
}
