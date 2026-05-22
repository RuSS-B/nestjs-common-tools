import { DynamicModule, Module, Provider } from '@nestjs/common';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxEvent } from './entities';
import {
  OutboxDataSource,
  OutboxModuleAsyncOptions,
  OutboxModuleOptions,
  OutboxModuleRootOptions,
} from './interfaces';
import {
  OUTBOX_EVENT_REPOSITORY,
  OUTBOX_MODULE_OPTIONS,
} from './outbox.constants';
import { resolveOutboxModuleOptions } from './outbox-options.util';
import { OutboxService } from './services';

@Module({})
export class OutboxModule {
  static forRoot(options: OutboxModuleRootOptions = {}): DynamicModule {
    return {
      module: OutboxModule,
      global: options.global,
      imports: [TypeOrmModule.forFeature([OutboxEvent], options.dataSource)],
      providers: [
        createOutboxOptionsProvider(options),
        createOutboxRepositoryProvider(options.dataSource),
        OutboxService,
      ],
      exports: [OutboxService],
    };
  }

  static forRootAsync(options: OutboxModuleAsyncOptions): DynamicModule {
    return {
      module: OutboxModule,
      global: options.global,
      imports: [
        ...(options.imports ?? []),
        TypeOrmModule.forFeature([OutboxEvent], options.dataSource),
      ],
      providers: [
        createOutboxAsyncOptionsProvider(options),
        createOutboxRepositoryProvider(options.dataSource),
        OutboxService,
      ],
      exports: [OutboxService],
    };
  }
}

function createOutboxOptionsProvider(options: OutboxModuleOptions): Provider {
  return {
    provide: OUTBOX_MODULE_OPTIONS,
    useValue: resolveOutboxModuleOptions(options),
  };
}

function createOutboxAsyncOptionsProvider(
  options: OutboxModuleAsyncOptions,
): Provider {
  return {
    provide: OUTBOX_MODULE_OPTIONS,
    useFactory: async (...args: unknown[]) =>
      resolveOutboxModuleOptions(await options.useFactory(...args)),
    inject: options.inject ?? [],
  };
}

function createOutboxRepositoryProvider(
  dataSource?: OutboxDataSource,
): Provider<Repository<OutboxEvent>> {
  return {
    provide: OUTBOX_EVENT_REPOSITORY,
    inject: [getRepositoryToken(OutboxEvent, dataSource)],
    useFactory: (repository: Repository<OutboxEvent>) => repository,
  };
}
