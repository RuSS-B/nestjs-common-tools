import * as winston from 'winston';
import LokiTransport from 'winston-loki';
import { TransportFactory } from '../interfaces';

export class LokiTransportFactory implements TransportFactory {
  constructor(
    private readonly level: string,
    private readonly lokiUrl: string,
    private readonly labels: Record<string, any>,
  ) {}

  createTransport(): LokiTransport {
    return new LokiTransport({
      host: this.lokiUrl,
      labels: this.labels,
      json: true,
      level: this.level,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => {
        throw err;
      },
    });
  }
}
