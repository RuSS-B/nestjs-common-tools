import { LoggerBuilder } from './logger-builder';
import { LokiTransportFactory } from './transport-factory';

jest.mock('./transport-factory/loki.transport-factory');

describe('LoggerBuilder', () => {
  it('should chain methods fluently', () => {
    const builder = new LoggerBuilder()
      .setLevel('log')
      .setAppName('test')
      .addTransport('json')
      .addTransport('nest');
    expect(builder).toBeInstanceOf(LoggerBuilder);
  });

  it('should throw when building without transports', () => {
    const builder = new LoggerBuilder();
    expect(() => builder.build()).toThrow();
  });

  describe('Loki transport', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should throw when lokiUrl is not provided', () => {
      const builder = new LoggerBuilder('TestApp', 'debug');

      expect(() => {
        builder.addTransport('loki', {} as any);
      }).toThrow('lokiUrl is required for Loki transport');
    });

    it('should use default labels with serviceName from appName when no custom labels provided', () => {
      const appName = 'TestApp';
      const builder = new LoggerBuilder(appName, 'debug');

      builder.addTransport('loki', {
        lokiUrl: 'http://loki:3100',
      });

      expect(LokiTransportFactory).toHaveBeenCalledWith(
        'debug',
        'http://loki:3100',
        { serviceName: appName },
      );
    });

    it('should use custom labels when provided', () => {
      const customLabels = {
        service: 'my-service',
        environment: 'production',
        version: '1.0.0',
      };

      const builder = new LoggerBuilder('TestApp', 'debug');

      builder.addTransport('loki', {
        lokiUrl: 'http://loki:3100',
        labels: customLabels,
      });

      expect(LokiTransportFactory).toHaveBeenCalledWith(
        'debug',
        'http://loki:3100',
        customLabels,
      );
    });

    it('should work with different log levels', () => {
      const builder = new LoggerBuilder('MyApp', 'error');

      builder.addTransport('loki', {
        lokiUrl: 'http://loki:3100',
        labels: { env: 'test' },
      });

      expect(LokiTransportFactory).toHaveBeenCalledWith(
        'error',
        'http://loki:3100',
        { env: 'test' },
      );
    });

    it('should handle multiple Loki transports with different labels', () => {
      const builder = new LoggerBuilder('MultiApp', 'debug');

      builder.addTransport('loki', {
        lokiUrl: 'http://loki-prod:3100',
        labels: { env: 'production' },
      });

      builder.addTransport('loki', {
        lokiUrl: 'http://loki-staging:3100',
        labels: { env: 'staging' },
      });

      expect(LokiTransportFactory).toHaveBeenCalledTimes(2);
      expect(LokiTransportFactory).toHaveBeenNthCalledWith(
        1,
        'debug',
        'http://loki-prod:3100',
        { env: 'production' },
      );
      expect(LokiTransportFactory).toHaveBeenNthCalledWith(
        2,
        'debug',
        'http://loki-staging:3100',
        { env: 'staging' },
      );
    });
  });
});
