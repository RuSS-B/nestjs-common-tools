import { WinstonModule } from 'nest-winston';
import * as Transport from 'winston-transport';
import { TransportFormat } from './logger.interface';
import { JsonFormatTransport } from './transports/json-format.transport';
import { NestFormatTransport } from './transports/nest-format.transport';

export class Logger {
  static create(
    appName: string,
    level: 'debug' | 'error' | 'fatal' | 'warn' | 'verbose' | 'log',
    format?: TransportFormat,
  ) {
    const transports: Transport[] = [];
    if (format === 'json') {
      transports.push(JsonFormatTransport.transport(level));
    } else {
      transports.push(NestFormatTransport.transport(level, appName));
    }

    return WinstonModule.createLogger({
      level: level,
      transports,
    });
  }
}
