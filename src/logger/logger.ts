import { LogLevelType, TransportOptions, TransportType } from './types';
import { LoggerBuilder } from './logger-builder';

export class Logger {
  /**
   * Creates a fluent logger builder
   * @param appName - Application name (default: 'NestApp')
   * @param level - Log level (default: 'debug')
   * @returns LoggerBuilder instance
   * @example
   * ```ts
   * const logger = Logger.builder('MyApp', 'info')
   *   .addTransport('json')
   *   .addTransport('loki', { lokiUrl: 'http://...' })
   *   .build();
   * ```
   */
  static builder(appName?: string, level?: LogLevelType): LoggerBuilder {
    return new LoggerBuilder(appName, level);
  }

  private static normalizeFormats(
    formats?: TransportType[] | TransportType,
  ): TransportType[] {
    if (!formats) {
      return ['nest'];
    }

    return Array.isArray(formats) ? formats : [formats];
  }

  static create(
    appName: string,
    level: LogLevelType,
    formats?: TransportType[] | TransportType,
    options?: TransportOptions,
  ) {
    const builder = Logger.builder(appName, level);

    const types = this.normalizeFormats(formats);

    types.forEach((type) => this.addTransportToBuilder(builder, type, options));

    return builder.build();
  }

  private static addTransportToBuilder(
    builder: LoggerBuilder,
    type: TransportType,
    options?: TransportOptions,
  ) {
    switch (type) {
      case 'loki':
        if (!options?.loki) {
          throw new Error('Loki transport requires options.loki to be provided');
        }
        builder.addTransport(type, options.loki);
        break;
      case 'json':
        builder.addTransport(type, options?.json);
        break;
      case 'nest':
        builder.addTransport(type, options?.nest);
        break;
    }
  }
}
