import { createPinoLoggerModuleOptions } from './pino-logger';

describe('createPinoLoggerModuleOptions', () => {
  it('builds JSON logger options from explicit config', () => {
    const options = createPinoLoggerModuleOptions({
      appName: 'billing-api',
      level: 'info',
      pretty: false,
      logHttpRequests: true,
      version: '1.2.3',
      environment: 'staging',
    });

    expect(options.pinoHttp).toMatchObject({
      level: 'info',
      base: {
        pid: process.pid,
        hostname: expect.any(String),
        app: 'billing-api',
        version: '1.2.3',
        env: 'staging',
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
      },
      autoLogging: true,
    });
    expect(options.pinoHttp).toHaveProperty('stream');
    expect(options.pinoHttp).not.toHaveProperty('transport');
  });

  it('builds pretty logger options when enabled', () => {
    const options = createPinoLoggerModuleOptions({
      appName: 'billing-api',
      level: 'debug',
      pretty: true,
      logHttpRequests: false,
    });

    expect(options.pinoHttp).toMatchObject({
      level: 'debug',
      autoLogging: false,
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
    });
    expect(options.pinoHttp).not.toHaveProperty('stream');
  });

  it('allows callers to override redaction paths and base fields', () => {
    const options = createPinoLoggerModuleOptions({
      appName: 'billing-api',
      redactPaths: ['req.headers.authorization', 'req.body.password'],
      base: {
        region: 'eu',
      },
    });

    expect(options.pinoHttp).toMatchObject({
      base: {
        app: 'billing-api',
        version: 'unknown',
        env: 'development',
        region: 'eu',
      },
      redact: {
        paths: ['req.headers.authorization', 'req.body.password'],
        censor: '[REDACTED]',
      },
    });
  });
});
