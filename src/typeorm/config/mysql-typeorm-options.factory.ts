import { Logger } from '@nestjs/common';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  CommonTypeormConfigOptions,
  ResolvedCommonTypeormConfigOptions,
  TYPEORM_CONFIG_DEFAULTS,
  useLogging,
  useSynchronize,
} from './typeorm-options.util';

export interface MysqlTypeormConfigOptions extends CommonTypeormConfigOptions {
  type?: 'mysql';
  connectTimeout?: number;
  acquireTimeout?: number;
  charset?: string;
  timezone?: string;
  connectorPackage?: 'mysql' | 'mysql2';
  supportBigNumbers?: boolean;
  bigNumberStrings?: boolean;
}

type ResolvedMysqlTypeormConfigOptions = ResolvedCommonTypeormConfigOptions &
  Required<
    Pick<MysqlTypeormConfigOptions, 'connectTimeout' | 'acquireTimeout'>
  > &
  Pick<
    MysqlTypeormConfigOptions,
    | 'charset'
    | 'timezone'
    | 'connectorPackage'
    | 'supportBigNumbers'
    | 'bigNumberStrings'
  >;

const logger = new Logger('MysqlTypeormConfig');

export function createMysqlTypeormOptions(
  options: MysqlTypeormConfigOptions,
): TypeOrmModuleOptions {
  const resolvedOptions: ResolvedMysqlTypeormConfigOptions = {
    ...TYPEORM_CONFIG_DEFAULTS,
    connectTimeout: 5000,
    acquireTimeout: 30_000,
    ...options,
  };

  return {
    type: 'mysql',
    url: encodeURI(resolvedOptions.databaseUrl),
    autoLoadEntities: true,
    maxQueryExecutionTime: resolvedOptions.maxQueryExecutionTime,
    synchronize: useSynchronize(resolvedOptions, logger),
    logging: useLogging(resolvedOptions.logging),
    retryAttempts: 5,
    poolSize: resolvedOptions.maxConnections,
    connectTimeout: resolvedOptions.connectTimeout,
    acquireTimeout: resolvedOptions.acquireTimeout,
    charset: resolvedOptions.charset,
    timezone: resolvedOptions.timezone,
    connectorPackage: resolvedOptions.connectorPackage,
    supportBigNumbers: resolvedOptions.supportBigNumbers,
    bigNumberStrings: resolvedOptions.bigNumberStrings,
  };
}
