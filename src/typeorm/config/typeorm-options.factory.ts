import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import {
  createMysqlTypeormOptions,
  MysqlTypeormConfigOptions,
} from './mysql-typeorm-options.factory';
import {
  createPostgresTypeormOptions,
  PostgresTypeormConfigOptions,
} from './postgres-typeorm-options.factory';

export type TypeOrmConfigOptions =
  | (PostgresTypeormConfigOptions & { type: 'postgres' })
  | (MysqlTypeormConfigOptions & { type: 'mysql' });

export function createTypeOrmOptions(
  options: TypeOrmConfigOptions,
): TypeOrmModuleOptions {
  switch (options.type) {
    case 'postgres':
      return createPostgresTypeormOptions(options);
    case 'mysql':
      return createMysqlTypeormOptions(options);
  }
}
