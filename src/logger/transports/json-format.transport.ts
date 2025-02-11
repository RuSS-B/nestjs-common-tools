import { format, transports } from 'winston';
import * as Transport from 'winston-transport';

export class JsonFormatTransport {
  static transport(level: string): Transport {
    return new transports.Console({
      level,
      format: format.combine(format.timestamp(), format.ms(), format.json()),
    });
  }
}
