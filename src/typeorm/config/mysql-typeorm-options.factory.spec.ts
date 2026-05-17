import { Logger } from '@nestjs/common';
import { createMysqlTypeormOptions } from './mysql-typeorm-options.factory';

describe('createMysqlTypeormOptions', () => {
  it('creates MySQL TypeORM options with safe defaults', () => {
    const options = createMysqlTypeormOptions({
      databaseUrl: 'mysql://user:p@ss@localhost:3306/app',
      isProduction: false,
    });

    expect(options).toEqual({
      type: 'mysql',
      url: 'mysql://user:p@ss@localhost:3306/app',
      autoLoadEntities: true,
      maxQueryExecutionTime: 500,
      synchronize: false,
      logging: false,
      retryAttempts: 5,
      poolSize: 20,
      connectTimeout: 5000,
      acquireTimeout: 30000,
    });
  });

  it('coerces string sync and logging flags', () => {
    const options = createMysqlTypeormOptions({
      databaseUrl: 'mysql://localhost/app',
      isProduction: false,
      sync: '1',
      logging: '1',
    });

    expect(options.synchronize).toBe(true);
    expect(options.logging).toBe(true);
  });

  it('disables synchronize in production and writes a warning', () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const options = createMysqlTypeormOptions({
      databaseUrl: 'mysql://localhost/app',
      isProduction: true,
      sync: true,
    });

    expect(options.synchronize).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith(
      "Your sync is on! But due security reasons it's not allowed to perform in production!",
    );
  });

  it('applies MySQL-specific connection options', () => {
    const options = createMysqlTypeormOptions({
      databaseUrl: 'mysql://localhost/app',
      isProduction: false,
      maxConnections: 10,
      maxQueryExecutionTime: 1000,
      connectTimeout: 4000,
      acquireTimeout: 12000,
      charset: 'utf8mb4',
      timezone: 'Z',
      connectorPackage: 'mysql2',
      supportBigNumbers: true,
      bigNumberStrings: true,
    });

    expect(options).toMatchObject({
      type: 'mysql',
      maxQueryExecutionTime: 1000,
      poolSize: 10,
      connectTimeout: 4000,
      acquireTimeout: 12000,
      charset: 'utf8mb4',
      timezone: 'Z',
      connectorPackage: 'mysql2',
      supportBigNumbers: true,
      bigNumberStrings: true,
    });
    expect(options).not.toHaveProperty('schema');
    expect(options).not.toHaveProperty('extra');
  });
});
