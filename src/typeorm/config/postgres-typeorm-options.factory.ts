import { Logger } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { TlsOptions } from 'node:tls';
import {
  CommonTypeormConfigOptions,
  TYPEORM_CONFIG_DEFAULTS,
  useLogging,
  useSynchronize,
} from './typeorm-options.util';

export interface PostgresTypeormDatabaseConnectionOptions {
  host: string;
  port?: number;
  username: string;
  password: string;
  database: string;
}

interface PostgresUrlConnectionOptions {
  url: string;
}

export interface PostgresTypeormConfigOptions extends Omit<
  CommonTypeormConfigOptions,
  'databaseUrl'
> {
  type?: 'postgres';
  databaseUrl?: string;
  database?: PostgresTypeormDatabaseConnectionOptions;
  appName?: string;
  schema?: string;
  sslCa?: string;
  queryTimeout?: number;
}

type ResolvedPostgresTypeormConfigOptions = Omit<
  PostgresTypeormConfigOptions &
    Required<
      Pick<
        PostgresTypeormConfigOptions,
        | 'sync'
        | 'logging'
        | 'maxConnections'
        | 'maxQueryExecutionTime'
        | 'queryTimeout'
      >
    >,
  'schema' | 'type'
> & {
  appName?: string;
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
  const connectionOptions = createConnectionOptions(resolvedOptions);
  const ssl = createSslOptions(resolvedOptions.sslCa);

  return {
    type: 'postgres',
    ...connectionOptions,
    ...(ssl ? { ssl } : {}),
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
      ...(resolvedOptions.appName
        ? { application_name: resolvedOptions.appName }
        : {}),
      query_timeout: resolvedOptions.queryTimeout,
    },
  };
}

function createConnectionOptions(
  options: Pick<
    ResolvedPostgresTypeormConfigOptions,
    'database' | 'databaseUrl' | 'sslCa'
  >,
): PostgresTypeormDatabaseConnectionOptions | PostgresUrlConnectionOptions {
  if (options.database) {
    return options.database;
  }

  if (!options.databaseUrl) {
    throw new Error(
      'databaseUrl or database connection options must be configured.',
    );
  }

  const databaseUrl = encodeURI(options.databaseUrl);

  return {
    url: options.sslCa
      ? removeConnectionStringSslParams(databaseUrl)
      : databaseUrl,
  };
}

function createSslOptions(sslCa?: string): TlsOptions | undefined {
  if (!sslCa) {
    return undefined;
  }

  return {
    ca: sslCa.replace(/\\n/g, '\n'),
    rejectUnauthorized: true,
  };
}

function removeConnectionStringSslParams(databaseUrl: string): string {
  const parsedUrl = new URL(databaseUrl);

  for (const param of ['ssl', 'sslcert', 'sslkey', 'sslmode', 'sslrootcert']) {
    parsedUrl.searchParams.delete(param);
  }

  return parsedUrl.toString();
}
