import { Logger } from '@nestjs/common';
import { createPostgresTypeormOptions } from './postgres-typeorm-options.factory';

describe('createPostgresTypeormOptions', () => {
  it('creates PostgreSQL TypeORM options with safe defaults', () => {
    const options = createPostgresTypeormOptions({
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
        query_timeout: 30000,
      },
    });
  });

  it('sets PostgreSQL application name only when appName is provided', () => {
    expect(
      createPostgresTypeormOptions({
        appName: 'parking-api',
        databaseUrl: 'postgres://localhost/app',
        isProduction: false,
      }).extra,
    ).toMatchObject({
      application_name: 'parking-api',
    });

    expect(
      createPostgresTypeormOptions({
        databaseUrl: 'postgres://localhost/app',
        isProduction: false,
      }).extra,
    ).not.toHaveProperty('application_name');
  });

  it('uses atomic PostgreSQL connection options when database is provided', () => {
    const options = createPostgresTypeormOptions({
      databaseUrl: 'postgres://ignored:ignored@ignored:5432/ignored',
      database: {
        host: 'db.example.com',
        port: 25060,
        username: 'doadmin',
        password: 'secret',
        database: 'defaultdb',
      },
      isProduction: false,
    });

    expect(options).toMatchObject({
      host: 'db.example.com',
      port: 25060,
      username: 'doadmin',
      password: 'secret',
      database: 'defaultdb',
    });
    expect(options).not.toHaveProperty('url');
  });

  it('adds SSL CA options and removes connection string SSL params', () => {
    const options = createPostgresTypeormOptions({
      databaseUrl:
        'postgres://user:password@db.example.com:25060/defaultdb?sslmode=verify-full&sslrootcert=/path/to/ca.crt&application_name=api',
      sslCa: '-----BEGIN CERTIFICATE-----\\ncert\\n-----END CERTIFICATE-----',
      isProduction: false,
    });

    expect(options).toMatchObject({
      url: 'postgres://user:password@db.example.com:25060/defaultdb?application_name=api',
      ssl: {
        ca: '-----BEGIN CERTIFICATE-----\ncert\n-----END CERTIFICATE-----',
        rejectUnauthorized: true,
      },
    });
  });

  it('throws when neither databaseUrl nor database is provided', () => {
    expect(() =>
      createPostgresTypeormOptions({
        isProduction: false,
      }),
    ).toThrow('databaseUrl or database connection options must be configured.');
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
