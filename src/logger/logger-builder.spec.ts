import { LoggerBuilder } from './logger-builder';

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
});
