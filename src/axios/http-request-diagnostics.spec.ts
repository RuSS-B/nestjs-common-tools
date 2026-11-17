import { performance } from 'node:perf_hooks';
import { AxiosError, AxiosHeaders } from 'axios';
import { ConsoleLogger, Logger } from '@nestjs/common';
import { Logger as PinoNestLogger, PinoLogger } from 'nestjs-pino';
import pino from 'pino';

import {
  createHttpRequestDiagnostics,
  getHttpResponseMetadata,
} from './http-request-diagnostics';
import type { HttpDiagnosticEvent } from './types';

const request = {
  method: 'GET',
  host: 'upstream.example.test',
  path: '/receipts/:id',
  timeoutMs: 30000,
};

describe('HTTP request diagnostics', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('correlates response and validation events using the captured HTTP snapshot', () => {
    const events: HttpDiagnosticEvent[] = [];
    const attempt = createHttpRequestDiagnostics({
      emit: (event) => {
        events.push(event);
      },
    }).start(request, { invoiceId: 'invoice-id' });
    const snapshot = attempt.captureResponse({
      status: 200,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      data: { secret: 'private-body' },
    });

    expect(events).toHaveLength(1);
    attempt.response(snapshot, { providerStatus: true });
    attempt.invalidResponse(snapshot, {
      issues: [{ path: 'result', code: 'invalid_type' }],
    });

    expect(events.map((event) => event.kind)).toEqual([
      'request_started',
      'response_received',
      'invalid_response',
    ]);
    expect(events[0].fields).toMatchObject(request);
    expect(events[0].fields.httpRequestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(events[1].fields).toMatchObject({
      ...snapshot,
      outcome: 'response_received',
      httpRequestId: events[0].fields.httpRequestId,
    });
    expect(events[2].fields).toMatchObject({
      ...snapshot,
      outcome: 'invalid_response',
      httpRequestId: events[0].fields.httpRequestId,
    });
    expect(snapshot.durationMs).toBeGreaterThanOrEqual(0);
    expect(events[1].context).toEqual({ invoiceId: 'invoice-id' });
    expect(events[2].metadata).toEqual({
      issues: [{ path: 'result', code: 'invalid_type' }],
    });
    expect(JSON.stringify(events)).not.toContain('private-body');
  });

  it('keeps interleaved attempts independent and separates extensions from transport fields', () => {
    const events: HttpDiagnosticEvent[] = [];
    const diagnostics = createHttpRequestDiagnostics({
      emit: (event) => {
        events.push(event);
      },
    });
    const now = jest.spyOn(performance, 'now').mockReturnValue(100);
    const context = { attemptId: 'first', httpRequestId: 'context-id' };
    const first = diagnostics.start(request, context);
    context.attemptId = 'second';
    now.mockReturnValue(130);
    const second = diagnostics.start({ ...request, method: 'POST' }, context);
    context.attemptId = 'changed-after-start';
    now.mockReturnValue(170);
    const snapshot = first.captureResponse({
      status: 200,
      headers: {},
      data: {},
    });

    now.mockReturnValue(190);
    second.failure(
      new AxiosError('private-message', 'ECONNRESET', undefined, {}),
    );
    now.mockReturnValue(250);
    first.response(
      snapshot,
      { httpRequestId: 'metadata-id', statusCode: 404 },
      true,
    );
    first.invalidResponse(snapshot);

    expect(snapshot.durationMs).toBe(70);
    expect(events[2].fields.durationMs).toBe(60);
    expect(events[3].fields.durationMs).toBe(70);
    expect(events[4].fields).toMatchObject({
      durationMs: 70,
      outcome: 'invalid_response',
    });
    expect(events[0].fields.httpRequestId).not.toBe(
      events[1].fields.httpRequestId,
    );
    expect(events[2]).toMatchObject({
      fields: {
        httpRequestId: events[1].fields.httpRequestId,
        method: 'POST',
        outcome: 'no_response',
      },
      context: { attemptId: 'second' },
    });
    expect(events[3]).toMatchObject({
      fields: {
        httpRequestId: events[0].fields.httpRequestId,
        statusCode: 200,
        outcome: 'provider_error',
      },
      context: { attemptId: 'first' },
      metadata: { httpRequestId: 'metadata-id', statusCode: 404 },
    });
    expect(JSON.stringify(events)).not.toContain('private-message');
  });

  it.each([
    { code: 'ETIMEDOUT', rawRequest: {}, outcome: 'timeout' },
    { code: 'ECONNABORTED', rawRequest: {}, outcome: 'timeout' },
    { code: 'ECONNRESET', rawRequest: {}, outcome: 'no_response' },
    { code: 'ENOTFOUND', rawRequest: {}, outcome: 'no_response' },
    { code: 'ERR_BAD_OPTION', rawRequest: undefined, outcome: 'request_error' },
  ])(
    'classifies $code without including the raw error or request',
    ({ code, rawRequest, outcome }) => {
      const emit = jest.fn();
      const attempt = createHttpRequestDiagnostics({ emit }).start(request);

      attempt.failure(
        new AxiosError(
          'private-error',
          code,
          {
            headers: new AxiosHeaders({ Authorization: 'private-token' }),
            data: 'private-request-body',
            url: '/private-path?key=private-query',
          },
          rawRequest,
        ),
      );

      expect(emit).toHaveBeenLastCalledWith(
        expect.objectContaining({
          kind: 'request_failed',
          fields: expect.objectContaining({
            outcome,
            errorCode: code,
            responseReceived: false,
          }),
        }),
      );
      expect(JSON.stringify(emit.mock.calls)).not.toContain('private-');
    },
  );

  it.each([404, 503])(
    'records HTTP %s without retaining its raw response',
    (status) => {
      const emit = jest.fn();
      const config = {
        headers: new AxiosHeaders({ 'X-Api-Key': 'private-key' }),
      };
      const attempt = createHttpRequestDiagnostics({ emit }).start(request);

      attempt.failure(
        new AxiosError(
          'private-error',
          'ERR_BAD_RESPONSE',
          config,
          {},
          {
            status,
            statusText: 'private-status',
            headers: {
              'content-type': 'application/json; charset=utf-8',
              'set-cookie': ['private-cookie'],
            },
            data: { message: 'private-message' },
            config,
          },
        ),
        { providerStatus: false },
      );

      expect(emit).toHaveBeenLastCalledWith(
        expect.objectContaining({
          kind: 'request_failed',
          fields: expect.objectContaining({
            statusCode: status,
            outcome: 'http_error',
            responseReceived: true,
            contentType: 'application/json',
            responseType: 'object',
          }),
          metadata: { providerStatus: false },
        }),
      );
      expect(JSON.stringify(emit.mock.calls)).not.toContain('private-');
    },
  );

  it('keeps safe cause codes while excluding arbitrary error text and invalid codes', () => {
    const events: HttpDiagnosticEvent[] = [];
    const attempt = createHttpRequestDiagnostics({
      emit: (event) => {
        events.push(event);
      },
    }).start(request);

    attempt.failure(
      Object.assign(new Error('private-error'), {
        cause: { code: 'ETIMEDOUT', body: 'private-body' },
      }),
    );
    attempt.failure(
      new AxiosError('private-error', 'private-code', undefined, {}),
    );
    attempt.failure(new Error('private-error'));

    expect(events[1].fields).toMatchObject({
      errorCode: 'ETIMEDOUT',
      outcome: 'timeout',
    });
    expect(events[2].fields.errorCode).toBeUndefined();
    expect(events[2].fields.outcome).toBe('no_response');
    expect(events[3].fields.outcome).toBe('request_error');
    expect(JSON.stringify(events)).not.toContain('private-');
  });

  it('does not propagate failures from a synchronous logging sink', () => {
    const emit = jest.fn(() => {
      throw new Error('sink unavailable');
    });
    const diagnostics = createHttpRequestDiagnostics({ emit });

    expect(() => {
      const attempt = diagnostics.start(request);
      const snapshot = attempt.captureResponse({
        status: 200,
        headers: {},
        data: null,
      });
      attempt.response(snapshot);
      attempt.invalidResponse(snapshot);
      attempt.failure(new Error('original request error'));
    }).not.toThrow();
    expect(emit).toHaveBeenCalledTimes(4);
  });

  it('lets project adapters format real Nest/Pino JSON logs without changing canonical events', () => {
    const records: Record<string, unknown>[] = [];
    const events: HttpDiagnosticEvent[] = [];
    const sink = pino(
      { messageKey: 'message' },
      {
        write(line: string) {
          records.push(JSON.parse(line) as Record<string, unknown>);
        },
      },
    );
    Logger.overrideLogger(
      new PinoNestLogger(sink as unknown as PinoLogger, {}),
    );

    try {
      const logger = new Logger('ExampleClient');
      const diagnostics = createHttpRequestDiagnostics({
        emit(event) {
          events.push(event);
          const fields = {
            ...event.context,
            ...event.metadata,
            ...event.fields,
            message: `Example ${event.kind}`,
          };
          if (
            event.kind === 'request_failed' ||
            event.kind === 'invalid_response'
          ) {
            logger.error({
              ...fields,
              outcome:
                event.fields.outcome === 'timeout'
                  ? 'no_response'
                  : event.fields.outcome,
            });
          } else {
            logger.log(fields);
          }
        },
      });
      const attempt = diagnostics.start(request, {
        operationId: 'operation-id',
      });
      attempt.failure(
        new AxiosError('private-message', 'ETIMEDOUT', undefined, {}),
        { providerStatus: false, statusCode: 999 },
      );

      expect(events[1].fields.outcome).toBe('timeout');
      expect(records[1]).toMatchObject({
        message: 'Example request_failed',
        context: 'ExampleClient',
        outcome: 'no_response',
        operationId: 'operation-id',
        providerStatus: false,
        httpRequestId: records[0].httpRequestId,
      });
      expect(records[1].statusCode).toBeUndefined();
      expect(JSON.stringify(records)).not.toContain('private-message');
    } finally {
      Logger.overrideLogger(new ConsoleLogger());
    }
  });
});

describe('HTTP response metadata', () => {
  it('summarizes binary content without exposing document bytes or media-type parameters', () => {
    expect(
      getHttpResponseMetadata(
        Buffer.from('private-document'),
        ' Image/PNG; filename=private-file ',
      ),
    ).toEqual({ contentType: 'image/png', responseType: 'binary' });
    expect(
      getHttpResponseMetadata(new ArrayBuffer(2), 'application/octet-stream'),
    ).toEqual({
      contentType: 'application/octet-stream',
      responseType: 'binary',
    });
    expect(getHttpResponseMetadata(null, 'private invalid header')).toEqual({
      contentType: undefined,
      responseType: 'null',
    });
    expect(
      getHttpResponseMetadata([], 'application/' + 'x'.repeat(65)),
    ).toEqual({ contentType: undefined, responseType: 'array' });
  });
});
