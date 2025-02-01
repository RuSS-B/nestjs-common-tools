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

export abstract class BaseEntityService<T extends ObjectLiteral> {
  protected logger = new Logger(this.constructor.name);

  protected constructor(protected readonly repository: Repository<T>) {}

  async create(entity: T | DeepPartial<T>): Promise<T> {
    return await this.save(entity);
  }

  async save(entity: T | DeepPartial<T>, options?: SaveOptions): Promise<T> {
    return (await this.repository.save(entity, options)) as T;
  }

  async update(
    id: number | number[] | string | string[] | FindOptionsWhere<T>,
    entity: T | DeepPartial<T>,
    options?: FindOneOptions<T>,
  ): Promise<T | null> {
    if (!options || !options.where) {
      options = { ...options, ...{ where: { id } } } as FindOneOptions;
    }
    await this.repository.update(id, entity as QueryDeepPartialEntity<T>);

    return this.findOne(options);
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

  toKeyValue(
    result: T[],
    key: keyof T,
    value: keyof T,
  ): Map<string, T[keyof T]> {
    const map = new Map<string, T[keyof T]>();
    result.forEach((item) => map.set(String(item[key]), item[value]));

    return map;
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

  async createOrUpdate(
    entity: T | DeepPartial<T>,
    onUpdate: T | DeepPartial<T>,
    options: FindOneOptions<T>,
  ): Promise<[T, boolean]> {
    const found = await this.findOne(options);

    if (found) {
      await this.save({ ...found, ...onUpdate });

      return [found, false];
    } else {
      return [await this.create(entity), true];
    }
  }
}
