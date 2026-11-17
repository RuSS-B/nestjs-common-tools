import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import axios, { type AxiosResponse } from 'axios';

import type {
  HttpDiagnosticFields,
  HttpDiagnosticKind,
  HttpRequestDiagnostics,
  HttpRequestDiagnosticsOptions,
  HttpRequestOutcome,
  HttpResponseDiagnostics,
} from './types';

export function getHttpResponseMetadata(data: unknown, contentType: unknown) {
  const mediaType =
    typeof contentType === 'string'
      ? contentType.split(';', 1)[0].trim().toLowerCase()
      : undefined;
  let responseType: string = typeof data;

  if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
    responseType = 'binary';
  } else if (data === null) {
    responseType = 'null';
  } else if (Array.isArray(data)) {
    responseType = 'array';
  }

  return {
    contentType:
      mediaType &&
      /^[a-z][a-z0-9.+-]{0,63}\/[a-z0-9][a-z0-9.+-]{0,63}$/.test(mediaType)
        ? mediaType
        : undefined,
    responseType,
  };
}

export function createHttpRequestDiagnostics(
  options: HttpRequestDiagnosticsOptions,
): HttpRequestDiagnostics {
  return {
    start(request, context = {}) {
      const startedAt = performance.now();
      const requestContext = { ...context };
      const requestFields: HttpDiagnosticFields = {
        httpRequestId: randomUUID(),
        method: request.method,
        host: request.host,
        path: request.path,
        timeoutMs: request.timeoutMs,
      };

      function emit(
        kind: HttpDiagnosticKind,
        fields: Partial<HttpDiagnosticFields> = {},
        metadata: Record<string, unknown> = {},
      ): void {
        try {
          options.emit({
            kind,
            fields: {
              durationMs: undefined,
              responseReceived: undefined,
              statusCode: undefined,
              contentType: undefined,
              responseType: undefined,
              errorCode: undefined,
              outcome: undefined,
              ...fields,
              ...requestFields,
            },
            context: { ...requestContext },
            metadata: { ...metadata },
          });
        } catch {
          // Observability must not replace the request's result or original exception when its sink fails.
        }
      }

      function captureResponse(
        response: Pick<AxiosResponse<unknown>, 'status' | 'headers' | 'data'>,
      ): HttpResponseDiagnostics {
        return {
          durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
          responseReceived: true,
          statusCode: response.status,
          ...getHttpResponseMetadata(
            response.data,
            response.headers?.['content-type'],
          ),
        };
      }

      function responseFields(
        snapshot: HttpResponseDiagnostics,
      ): Partial<HttpDiagnosticFields> {
        return {
          durationMs: snapshot.durationMs,
          responseReceived: true,
          statusCode: snapshot.statusCode,
          contentType: snapshot.contentType,
          responseType: snapshot.responseType,
        };
      }

      emit('request_started');

      return {
        captureResponse,
        response(snapshot, metadata = {}, providerError = false) {
          emit(
            'response_received',
            {
              ...responseFields(snapshot),
              outcome: providerError ? 'provider_error' : 'response_received',
            },
            metadata,
          );
        },
        invalidResponse(snapshot, metadata = {}) {
          emit(
            'invalid_response',
            { ...responseFields(snapshot), outcome: 'invalid_response' },
            metadata,
          );
        },
        failure(error, metadata = {}) {
          const axiosError = axios.isAxiosError<unknown>(error)
            ? error
            : undefined;
          const cause =
            error instanceof Error && 'cause' in error
              ? error.cause
              : undefined;
          const causeCode =
            typeof cause === 'object' && cause !== null && 'code' in cause
              ? cause.code
              : undefined;
          const code = axiosError?.code ?? causeCode;
          const errorCode =
            typeof code === 'string' && /^[A-Z][A-Z0-9_]{1,39}$/.test(code)
              ? code
              : undefined;
          let outcome: HttpRequestOutcome = 'request_error';

          if (axiosError?.response) {
            outcome = 'http_error';
          } else if (
            errorCode === 'ECONNABORTED' ||
            errorCode === 'ETIMEDOUT'
          ) {
            outcome = 'timeout';
          } else if (axiosError?.request) {
            outcome = 'no_response';
          }

          emit(
            'request_failed',
            {
              durationMs: Math.max(
                0,
                Math.round(performance.now() - startedAt),
              ),
              responseReceived: !!axiosError?.response,
              ...(axiosError?.response
                ? captureResponse(axiosError.response)
                : {}),
              errorCode,
              outcome,
            },
            metadata,
          );
        },
      };
    },
  };
}
