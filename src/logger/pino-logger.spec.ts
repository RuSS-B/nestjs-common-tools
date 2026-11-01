import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import pino from 'pino';
import pinoHttp, { type Options } from 'pino-http';
import {
  createPinoLoggerModuleOptions,
  type PinoLoggerConfig,
  type PinoLogLevel,
} from './pino-logger';

function getPinoHttpOptions(config: PinoLoggerConfig): Options {
  const { pinoHttp } = createPinoLoggerModuleOptions(config);

  if (!pinoHttp || Array.isArray(pinoHttp) || 'write' in pinoHttp) {
    throw new Error('Expected a pino-http options object');
  }

  return pinoHttp;
}

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
    expect(options.pinoHttp).not.toHaveProperty('formatters');
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

  describe('JSON output', () => {
    let destination: ReturnType<typeof pino.destination>;
    let records: Array<Record<string, unknown>>;

    beforeEach(() => {
      records = [];
      destination = pino.destination({ dest: '/dev/null', sync: true });
      jest.spyOn(destination, 'write').mockImplementation((chunk) => {
        const record: Record<string, unknown> = JSON.parse(chunk.toString());
        records.push(record);
        return true;
      });
      jest.spyOn(pino, 'destination').mockReturnValue(destination);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      destination.end();
    });

    it('writes all six Pino level names as strings when trace is enabled', () => {
      const { logger } = pinoHttp(
        getPinoHttpOptions({ appName: 'billing-api', level: 'trace' }),
      );
      const levels: pino.Level[] = [
        'trace',
        'debug',
        'info',
        'warn',
        'error',
        'fatal',
      ];

      for (const level of levels) {
        logger[level](`${level} message`);
      }

      expect(records.map((record) => record.level)).toEqual(levels);
      expect(records.map((record) => record.message)).toEqual(
        levels.map((level) => `${level} message`),
      );
    });

    it.each<{ level?: PinoLogLevel; expected: string[] }>([
      {
        level: undefined,
        expected: ['debug', 'info', 'warn', 'error', 'fatal'],
      },
      { level: 'debug', expected: ['debug', 'info', 'warn', 'error', 'fatal'] },
      { level: 'info', expected: ['info', 'warn', 'error', 'fatal'] },
      { level: 'silent', expected: [] },
    ])('respects the configured threshold $level', ({ level, expected }) => {
      const { logger } = pinoHttp(
        getPinoHttpOptions({ appName: 'billing-api', level }),
      );

      logger.trace('trace message');
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      logger.fatal('fatal message');

      expect(records.map((record) => record.level)).toEqual(expected);
    });

    it('preserves timestamps, message keys, base overrides and custom redaction', () => {
      const { logger } = pinoHttp(
        getPinoHttpOptions({
          appName: 'billing-api',
          version: '1.2.3',
          environment: 'staging',
          base: { region: 'eu', env: 'test' },
          redactPaths: ['password'],
        }),
      );
      const before = Date.now();

      logger.info({ password: 'secret', context: 'BillingService' }, 'paid');

      const after = Date.now();
      expect(records).toEqual([
        {
          level: 'info',
          timestamp: expect.any(Number),
          pid: process.pid,
          hostname: expect.any(String),
          app: 'billing-api',
          version: '1.2.3',
          env: 'test',
          region: 'eu',
          password: '[REDACTED]',
          context: 'BillingService',
          message: 'paid',
        },
      ]);
      expect(records[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(records[0].timestamp).toBeLessThanOrEqual(after);
    });

    it.each([true, false, undefined])(
      'preserves HTTP autoLogging=%s and default header redaction',
      (logHttpRequests) => {
        const httpLogger = pinoHttp(
          getPinoHttpOptions({ appName: 'billing-api', logHttpRequests }),
        );
        const socket = new Socket();
        const request = new IncomingMessage(socket);
        request.method = 'GET';
        request.url = '/health';
        request.headers = {
          authorization: 'Bearer secret',
          cookie: 'session=secret',
        };
        const response = new ServerResponse(request);
        response.setHeader('set-cookie', 'session=secret');
        response.writeHead(200);

        try {
          httpLogger(request, response);
          request.log.info('application message');
          response.end();
          response.emit('finish');

          expect(records[0]).toMatchObject({
            level: 'info',
            message: 'application message',
            app: 'billing-api',
            req: {
              method: 'GET',
              url: '/health',
              headers: {
                authorization: '[REDACTED]',
                cookie: '[REDACTED]',
              },
            },
          });

          if (logHttpRequests) {
            expect(records).toHaveLength(2);
            expect(records[1]).toMatchObject({
              level: 'info',
              message: 'request completed',
              res: {
                statusCode: 200,
                headers: { 'set-cookie': '[REDACTED]' },
              },
              responseTime: expect.any(Number),
            });
          } else {
            expect(records).toHaveLength(1);
          }
        } finally {
          response.destroy();
          socket.destroy();
        }
      },
    );
  });
});
