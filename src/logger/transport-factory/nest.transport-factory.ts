import { format, transports } from 'winston';
import { utilities } from 'nest-winston';
import { TransportFactory } from '../interfaces';
import { ConsoleTransportInstance } from 'winston/lib/winston/transports';

export class NestTransportFactory implements TransportFactory {
  constructor(
    private readonly level: string,
    private readonly appName: string = 'app',
  ) {}

  createTransport(): ConsoleTransportInstance {
    return new transports.Console({
      level: this.level,
      format: format.combine(
        format.timestamp(),
        format.ms(),
        utilities.format.nestLike(this.appName, {
          colors: true,
          prettyPrint: true,
        }),
      ),
    });
  }
}
