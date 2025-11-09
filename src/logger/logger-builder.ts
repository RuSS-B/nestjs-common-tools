import { LogLevelType, TransportType } from './types';
import {
  JsonTransportFactory,
  LokiTransportFactory,
  NestTransportFactory,
} from './transport-factory';
import * as Transport from 'winston-transport';
import { WinstonModule } from 'nest-winston';
import { LokiTransportOptions } from './interfaces';
import { JsonTransportOptions } from './interfaces/json-transport-options';

export class LoggerBuilder {
  private transports: Transport[] = [];

  constructor(
    private appName: string = 'NestApp',
    private level: LogLevelType = 'debug',
  ) {}

  setLevel(level: LogLevelType) {
    this.level = level;

    return this;
  }

  setAppName(appName: string) {
    this.appName = appName;

    return this;
  }

  addTransport(type: 'loki', options: LokiTransportOptions): this;
  addTransport(type: 'json', options?: JsonTransportOptions): this;
  addTransport(type: 'nest', options?: {}): this;
  addTransport(type: TransportType, options?: Record<string, any>): this;
  addTransport(transportType: TransportType, options?: Record<string, any>) {
    const transport = this.createTransport(transportType, options);
    this.transports.push(transport);

    return this;
  }

  build() {
    if (!this.transports.length) {
      throw new Error('Should be at least one transport specified.');
    }

    return WinstonModule.createLogger({
      level: this.level,
      transports: this.transports,
    });
  }

  private createTransport(
    type: TransportType,
    options?: Record<string, any>,
  ): Transport {
    switch (type) {
      case 'json':
        return new JsonTransportFactory(this.level).createTransport();
      case 'loki':
        if (!options?.lokiUrl) {
          throw new Error('lokiUrl is required for Loki transport');
        }

        return new LokiTransportFactory(
          this.level,
          options.lokiUrl,
          this.appName,
        ).createTransport();
      case 'nest':
        return new NestTransportFactory(
          this.level,
          this.appName,
        ).createTransport();
      default:
        throw new Error(`Unknown transport type: ${type}`);
    }
  }
}
