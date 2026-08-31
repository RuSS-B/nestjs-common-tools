import type { LoggerService } from '@nestjs/common';
import axios from 'axios';

import { getErrorMessage } from '../common/util/error.util';

export type HttpFailureLogger = Pick<LoggerService, 'error'>;

export function logHttpRequestFailure(
  logger: HttpFailureLogger,
  error: unknown,
  message: string,
  context: Record<string, unknown> = {},
): void {
  if (!axios.isAxiosError<unknown>(error)) {
    logger.error(
      {
        ...context,
        errorMessage: getErrorMessage(error),
      },
      message,
    );

    return;
  }

  logger.error(
    {
      ...context,
      method: error.config?.method?.toUpperCase(),
      baseUrl: error.config?.baseURL,
      path: error.config?.url,
      statusCode: error.response?.status,
      errorCode: error.code,
      errorMessage: error.message,
      upstreamResponse: error.response?.data,
    },
    message,
  );
}
