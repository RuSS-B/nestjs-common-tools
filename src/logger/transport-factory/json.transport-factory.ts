import { format, transports } from 'winston';
import { TransportFactory } from '../interfaces';
import { ConsoleTransportInstance } from 'winston/lib/winston/transports';

export class JsonTransportFactory implements TransportFactory {
  constructor(private readonly level: string) {}

  createTransport(): ConsoleTransportInstance {
    return new transports.Console({
      level: this.level,
      format: format.combine(format.timestamp(), format.ms(), format.json()),
    });
  }
}
