import type { AxiosResponse } from 'axios';

export type HttpDiagnosticKind =
  | 'request_started'
  | 'response_received'
  | 'request_failed'
  | 'invalid_response';

export type HttpRequestOutcome =
  | 'response_received'
  | 'provider_error'
  | 'http_error'
  | 'timeout'
  | 'no_response'
  | 'request_error'
  | 'invalid_response';

export interface HttpRequestInfo {
  readonly method: string;
  readonly host?: string;
  readonly path?: string;
  readonly timeoutMs?: number;
}

export interface HttpResponseDiagnostics {
  readonly durationMs: number;
  readonly responseReceived: true;
  readonly statusCode: number;
  readonly contentType?: string;
  readonly responseType: string;
}

export interface HttpDiagnosticFields extends HttpRequestInfo {
  readonly httpRequestId: string;
  readonly durationMs?: number;
  readonly responseReceived?: boolean;
  readonly statusCode?: number;
  readonly contentType?: string;
  readonly responseType?: string;
  readonly errorCode?: string;
  readonly outcome?: HttpRequestOutcome;
}

export interface HttpDiagnosticEvent {
  readonly kind: HttpDiagnosticKind;
  readonly fields: Readonly<HttpDiagnosticFields>;
  readonly context: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface HttpRequestDiagnosticsOptions {
  /** A synchronous sink. Only explicitly projected context and metadata should be supplied by callers. */
  readonly emit: (event: HttpDiagnosticEvent) => void;
}

export interface HttpRequestAttempt {
  /** Captures transport facts without emitting an event or retaining the response body. */
  captureResponse(
    response: Pick<AxiosResponse<unknown>, 'status' | 'headers' | 'data'>,
  ): HttpResponseDiagnostics;
  response(
    snapshot: HttpResponseDiagnostics,
    metadata?: Record<string, unknown>,
    providerError?: boolean,
  ): void;
  failure(error: unknown, metadata?: Record<string, unknown>): void;
  invalidResponse(
    snapshot: HttpResponseDiagnostics,
    metadata?: Record<string, unknown>,
  ): void;
}

export interface HttpRequestDiagnostics {
  start(
    request: HttpRequestInfo,
    context?: Record<string, unknown>,
  ): HttpRequestAttempt;
}
