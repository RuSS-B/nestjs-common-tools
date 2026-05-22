import { hostname } from 'node:os';
import { nativeLoggerOptions, type Params } from 'nestjs-pino';
import pino from 'pino';

export type PinoLogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'
  | 'silent';

export interface PinoLoggerConfig {
  appName: string;
  level?: PinoLogLevel;
  pretty?: boolean;
  logHttpRequests?: boolean;
  version?: string;
  environment?: string;
  redactPaths?: string[];
  base?: Record<string, unknown>;
}

const DEFAULT_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
];

export function createPinoLoggerModuleOptions(
  config: PinoLoggerConfig,
): Params {
  const pinoHttp = {
    ...nativeLoggerOptions,
    level: config.level ?? 'debug',
    base: {
      pid: process.pid,
      hostname: hostname(),
      app: config.appName,
      version: config.version ?? 'unknown',
      env: config.environment ?? 'development',
      ...config.base,
    },
    redact: {
      paths: config.redactPaths ?? DEFAULT_REDACT_PATHS,
      censor: '[REDACTED]',
    },
    autoLogging: config.logHttpRequests ?? false,
  };

  if (config.pretty) {
    delete pinoHttp.formatters;

    return {
      pinoHttp: {
        ...pinoHttp,
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname,app,version,env',
            messageFormat: '[{context}] {message}',
            messageKey: 'message',
            singleLine: true,
            timestampKey: 'timestamp',
            translateTime: 'SYS:HH:MM:ss.l',
          },
        },
      },
    };
  }

  return {
    pinoHttp: {
      ...pinoHttp,
      stream: pino.destination({
        sync: false,
      }),
    },
  };
}
