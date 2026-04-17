import {
  createLegacyPaginatedResponseSchema,
  createPaginatedResponseSchema,
} from './paginated-response.schema';

describe('paginated response swagger schema', () => {
  it('should create the standard paginated response schema', () => {
    expect(
      createPaginatedResponseSchema({
        $ref: '#/components/schemas/UserDto',
      }),
    ).toEqual({
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/UserDto',
          },
        },
        pagination: {
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
        },
      },
    });
  });

  it('should create the legacy paginated response schema', () => {
    expect(
      createLegacyPaginatedResponseSchema({
        $ref: '#/components/schemas/UserDto',
      }),
    ).toEqual({
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/UserDto',
          },
        },
        pagination: {
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
        },
      },
    });
  });
});
