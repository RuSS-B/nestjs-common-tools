import { Logger } from '@nestjs/common';
import { createPostgresTypeormOptions } from './postgres-typeorm-options.factory';

describe('createPostgresTypeormOptions', () => {
  it('creates PostgreSQL TypeORM options with safe defaults', () => {
    const options = createPostgresTypeormOptions({
      appName: 'parking-api',
      databaseUrl: 'postgres://user:p@ss@localhost:5432/app',
      isProduction: false,
    });

    expect(options).toEqual({
      type: 'postgres',
      url: 'postgres://user:p@ss@localhost:5432/app',
      autoLoadEntities: true,
      schema: undefined,
      maxQueryExecutionTime: 500,
      synchronize: false,
      logging: false,
      retryAttempts: 5,
      extra: {
        options: undefined,
        max: 20,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 5000,
        maxUses: 10000,
        keepAlive: true,
        application_name: 'parking-api',
        query_timeout: 30000,
      },
    });
  });

  it('coerces string sync and logging flags', () => {
    const options = createPostgresTypeormOptions({
      appName: 'parking-api',
      databaseUrl: 'postgres://localhost/app',
      isProduction: false,
      sync: '1',
      logging: '1',
    });

    expect(options.synchronize).toBe(true);
    expect(options.logging).toBe(true);
  });

  it('disables synchronize in production and writes a warning', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const options = createPostgresTypeormOptions({
      appName: 'parking-api',
      databaseUrl: 'postgres://localhost/app',
      isProduction: true,
      sync: true,
    });

    expect(options.synchronize).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      "Your sync is on! But due security reasons it's not allowed to perform in production!",
    );
  });

  it('applies PostgreSQL schema search path when schema is provided', () => {
    const options = createPostgresTypeormOptions({
      appName: 'parking-api',
      databaseUrl: 'postgres://localhost/app',
      isProduction: false,
      schema: 'tenant_1',
      maxConnections: 10,
      maxQueryExecutionTime: 1000,
      queryTimeout: 15000,
    });

    expect(options).toMatchObject({
      schema: 'tenant_1',
      maxQueryExecutionTime: 1000,
    });
    expect(options.extra).toMatchObject({
      options: '-c search_path=tenant_1,public',
      max: 10,
      query_timeout: 15000,
    });
  });
});
