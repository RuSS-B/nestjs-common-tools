import { format, transports } from 'winston';
import { utilities } from 'nest-winston';

export class NestFormatTransport {
  static transport(level: string, appName = 'app') {
    return new transports.Console({
      level,
      format: format.combine(
        format.timestamp(),
        format.ms(),
        utilities.format.nestLike(appName, {
          colors: true,
          prettyPrint: true,
        }),
      ),
    });
  }
}
