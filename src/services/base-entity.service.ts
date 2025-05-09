import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  InsertResult,
  ObjectLiteral,
  Repository,
  SaveOptions,
} from 'typeorm';
import { Logger } from '@nestjs/common';
import { UpsertOptions } from 'typeorm/repository/UpsertOptions';
import { collectionToMap } from '../common/util';

export abstract class BaseEntityService<T extends ObjectLiteral> {
  protected logger = new Logger(this.constructor.name);

  protected constructor(protected readonly repository: Repository<T>) {}

  create(entity: T | DeepPartial<T>): T {
    return this.repository.create(entity);
  }

  async save(entity: T | DeepPartial<T>): Promise<T>;
  async save(entities: (T | DeepPartial<T>)[]): Promise<T[]>;
  async save(
    entityOrEntities: T | DeepPartial<T> | (T | DeepPartial<T>)[],
    options?: SaveOptions,
  ): Promise<T | T[]> {
    if (Array.isArray(entityOrEntities)) {
      return await this.repository.save(entityOrEntities, options);
    }
    return await this.repository.save(entityOrEntities, options);
  }

  async update(
    id: number | number[] | string | string[] | FindOptionsWhere<T>,
    entity: T | DeepPartial<T>,
    options?: FindOneOptions<T>,
  ): Promise<T> {
    if (!options || !options.where) {
      const where = typeof id === 'object' && !Array.isArray(id) ? id : { id };
      options = { ...options, ...{ where } } as FindOneOptions;
    }
    await this.repository.update(id, entity as QueryDeepPartialEntity<T>);

    const data = await this.findOne(options);

    if (data === null) {
      throw new Error(`Unable to find ${id}`);
    }

    return data;
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options);
  }

  async findOneBy(where: FindOptionsWhere<T>): Promise<T | null> {
    return this.repository.findOneBy(where);
  }

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options);
  }

  async findBy(where: FindOptionsWhere<T>): Promise<T[]> {
    return this.repository.findBy(where);
  }

  async findAll(): Promise<T[]> {
    return this.find();
  }

  async findAndCount(options?: FindManyOptions<T>): Promise<[T[], number]> {
    return this.repository.findAndCount(options);
  }

  async delete(id: number | string | FindOptionsWhere<T>): Promise<void> {
    await this.repository.delete(id);
  }

  async softDelete(id: number | string): Promise<void> {
    await this.repository.softDelete(id);
  }

  toKeyValue(data: T[], key: keyof T, value: keyof T): Map<string, T[keyof T]> {
    return collectionToMap<T>(data, key, value);
  }

  async upsert(
    entityOrEntities: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[],
    conflictPathsOrOptions: string[] | UpsertOptions<T>,
  ): Promise<InsertResult> {
    return await this.repository.upsert(
      entityOrEntities,
      conflictPathsOrOptions,
    );
  }
}
