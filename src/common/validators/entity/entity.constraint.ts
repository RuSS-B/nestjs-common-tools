import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { validate } from 'uuid';
import { EntityManager } from 'typeorm';
import { IS_ENTITY } from '@common/validators/entity/entity.constant';
import { EntityValidationOptions } from '@common/validators/entity/entity.interface';

@ValidatorConstraint({ name: IS_ENTITY, async: true })
@Injectable()
export class EntityConstraint implements ValidatorConstraintInterface {
  constructor(private readonly entityManager: EntityManager) {}

  async validate(
    value: any,
    validationArguments: ValidationArguments,
  ): Promise<boolean> {
    const [target, options = {}] = validationArguments.constraints;
    const {
      isUuid = false,
      each = false,
      property = 'id',
    } = options as EntityValidationOptions;

    if (isUuid) {
      if (!this.validateUuid(value)) {
        return false;
      }
    }

    if (each) {
      if (!Array.isArray(value)) {
        return false;
      }

      if (value.length === 0) {
        return true;
      }

      if (isUuid && !value.every((v) => this.validateUuid(v))) {
        return false;
      }

      const count = await this.entityManager
        .getRepository(target)
        .createQueryBuilder('entity')
        .where(`entity.${property} IN (:...values)`, { values: value })
        .getCount();

      return count === value.length;
    }

    return await this.entityManager
      .getRepository(target)
      .createQueryBuilder('entity')
      .where({ [property]: value })
      .getExists();
  }

  defaultMessage(validationArguments: ValidationArguments): string {
    const [entityType, options = {}] = validationArguments.constraints;
    const { each = false, property = 'id' } =
      options as EntityValidationOptions;
    const field = validationArguments.property;
    const value = validationArguments.value;
    const entityName = entityType.name;

    if (each) {
      return `All elements in "${field}" must be existing ${entityName} ${property}s`;
    }

    return `A ${entityName} with ${property} "${value}" does not exist`;
  }

  private validateUuid(value: string): boolean {
    return validate(value);
  }
}
