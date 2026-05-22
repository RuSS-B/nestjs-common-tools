import type { ModuleMetadata } from '@nestjs/common';
import type { DataSource, DataSourceOptions } from 'typeorm';

export type OutboxDataSource = DataSource | DataSourceOptions | string;

export interface OutboxOperationalPolicy {
  claimBatchSize?: number;
  maxRetries?: number;
  staleProcessingMinutes?: number;
  resetStaleProcessingEvents?: boolean;
  maxConcurrentEvents?: number;
  processedEventRetentionHours?: number;
}

export interface OutboxResolvedOperationalPolicy {
  claimBatchSize: number;
  maxRetries: number;
  staleProcessingMinutes: number;
  resetStaleProcessingEvents: boolean;
  maxConcurrentEvents?: number;
  processedEventRetentionHours: number;
}

export interface OutboxModuleOptions {
  operationalPolicy?: OutboxOperationalPolicy;
}

export interface OutboxModuleRootOptions extends OutboxModuleOptions {
  dataSource?: OutboxDataSource;
  global?: boolean;
}

export interface OutboxModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  useFactory: (
    ...args: any[]
  ) => Promise<OutboxModuleOptions> | OutboxModuleOptions;
  inject?: any[];
  dataSource?: OutboxDataSource;
  global?: boolean;
}

export interface OutboxResolvedModuleOptions {
  operationalPolicy: OutboxResolvedOperationalPolicy;
}
