import { Logger } from '@nestjs/common';

export interface CommonTypeormConfigOptions {
  databaseUrl: string;
  sync?: boolean | string;
  logging?: boolean | string;
  isProduction: boolean;
  maxConnections?: number;
  maxQueryExecutionTime?: number;
}

export type ResolvedCommonTypeormConfigOptions =
  Required<CommonTypeormConfigOptions>;

export const TYPEORM_CONFIG_DEFAULTS: Pick<
  ResolvedCommonTypeormConfigOptions,
  'sync' | 'logging' | 'maxConnections' | 'maxQueryExecutionTime'
> = {
  sync: false,
  logging: false,
  maxConnections: 20,
  maxQueryExecutionTime: 500,
};

export function useSynchronize(
  options: Pick<ResolvedCommonTypeormConfigOptions, 'isProduction' | 'sync'>,
  logger: Logger,
): boolean {
  const doSync = coerceBoolean(options.sync);

  if (options.isProduction && doSync) {
    logger.warn(
      "Your sync is on! But due security reasons it's not allowed to perform in production!",
    );

    return false;
  }

  return doSync;
}

export function useLogging(logging: boolean | string): boolean {
  return coerceBoolean(logging);
}

function coerceBoolean(value: boolean | string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return !!Number(value);
}
