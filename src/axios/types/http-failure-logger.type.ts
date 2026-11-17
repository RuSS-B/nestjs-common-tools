import type { LoggerService } from '@nestjs/common';

export type HttpFailureLogger = Pick<LoggerService, 'error'>;
