describe('ApiPropertyOptionalIfAvailable', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should return a no-op decorator when swagger is unavailable', () => {
    jest.isolateModules(() => {
      const {
        ApiPropertyOptionalIfAvailable,
      } = require('./api-property-optional-if-available.decorator');

      class TestDto {
        value!: string;
      }

      const decorator = ApiPropertyOptionalIfAvailable({
        description: 'value',
      });

      expect(() =>
        decorator(TestDto.prototype, 'value'),
      ).not.toThrow();
      expect(Reflect.getMetadataKeys(TestDto.prototype, 'value')).toEqual([]);
    });
  });

  it('should forward options to ApiPropertyOptional when swagger is available', () => {
    const swaggerDecorator = jest.fn();
    const apiPropertyOptional = jest.fn(() => swaggerDecorator);

    jest.doMock(
      '@nestjs/swagger',
      () => ({
        ApiPropertyOptional: apiPropertyOptional,
      }),
      { virtual: true },
    );

    jest.isolateModules(() => {
      const {
        ApiPropertyOptionalIfAvailable,
      } = require('./api-property-optional-if-available.decorator');

      class TestDto {
        value!: string;
      }

      const options = {
        description: 'value',
        example: 'demo',
      };

      const decorator = ApiPropertyOptionalIfAvailable(options);
      decorator(TestDto.prototype, 'value');

      expect(apiPropertyOptional).toHaveBeenCalledWith(options);
      expect(swaggerDecorator).toHaveBeenCalledWith(TestDto.prototype, 'value');
    });
  });
});
