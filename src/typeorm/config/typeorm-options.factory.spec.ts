import {
  createMysqlTypeormOptions,
  createPostgresTypeormOptions,
  createTypeOrmOptions,
} from './index';

describe('createTypeOrmOptions', () => {
  it('delegates PostgreSQL options to the PostgreSQL factory', () => {
    const options = {
      type: 'postgres' as const,
      appName: 'parking-api',
      databaseUrl: 'postgres://localhost/app',
      isProduction: false,
      schema: 'tenant_1',
    };

    expect(createTypeOrmOptions(options)).toEqual(
      createPostgresTypeormOptions(options),
    );
  });

  it('delegates MySQL options to the MySQL factory', () => {
    const options = {
      type: 'mysql' as const,
      databaseUrl: 'mysql://localhost/app',
      isProduction: false,
      connectorPackage: 'mysql2' as const,
    };

    expect(createTypeOrmOptions(options)).toEqual(
      createMysqlTypeormOptions(options),
    );
  });
});
