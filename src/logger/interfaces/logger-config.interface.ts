import { LogLevelType, TransportType } from '../types';

export interface LoggerConfig {
  appName: string;
  level?: LogLevelType;
  transports: Array<{
    type: TransportType;
    options?: Record<string, any>;
  }>;
}
