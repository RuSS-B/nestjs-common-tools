import { registerDecorator, ValidationOptions } from 'class-validator';
import { EntityValidationOptions } from './entity.interface';
import { IS_ENTITY } from './entity.constant';
import { EntityConstraint } from './entity.constraint';

export function IsEntity(
  entityType: Function,
  options?: EntityValidationOptions & ValidationOptions,
) {
  const { isUuid, each, property, ...validationOptions } = options || {};

  return function (object: any, propertyName: string) {
    registerDecorator({
      name: IS_ENTITY,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [entityType, { isUuid, each, property }],
      validator: EntityConstraint,
    });
  };
}
