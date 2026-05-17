import { Logger } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  CommonTypeormConfigOptions,
  ResolvedCommonTypeormConfigOptions,
  TYPEORM_CONFIG_DEFAULTS,
  useLogging,
  useSynchronize,
} from './typeorm-options.util';

export interface PostgresTypeormConfigOptions extends CommonTypeormConfigOptions {
  type?: 'postgres';
  appName: string;
  schema?: string;
  queryTimeout?: number;
}

type ResolvedPostgresTypeormConfigOptions = Omit<
  ResolvedCommonTypeormConfigOptions &
    Required<Pick<PostgresTypeormConfigOptions, 'appName' | 'queryTimeout'>>,
  'schema' | 'type'
> & {
  schema?: string;
};

const logger = new Logger('PostgresTypeormConfig');

export function createPostgresTypeormOptions(
  options: PostgresTypeormConfigOptions,
): TypeOrmModuleOptions {
  const resolvedOptions: ResolvedPostgresTypeormConfigOptions = {
    ...TYPEORM_CONFIG_DEFAULTS,
    queryTimeout: 30_000,
    ...options,
  };

  return {
    type: 'postgres',
    url: encodeURI(resolvedOptions.databaseUrl),
    autoLoadEntities: true,
    schema: resolvedOptions.schema,
    maxQueryExecutionTime: resolvedOptions.maxQueryExecutionTime,
    synchronize: useSynchronize(resolvedOptions, logger),
    logging: useLogging(resolvedOptions.logging),
    retryAttempts: 5,
    extra: {
      options: resolvedOptions.schema
        ? `-c search_path=${resolvedOptions.schema},public`
        : undefined,
      max: resolvedOptions.maxConnections,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
      maxUses: 10000,
      keepAlive: true,
      application_name: resolvedOptions.appName,
      query_timeout: resolvedOptions.queryTimeout,
    },
  };
}
