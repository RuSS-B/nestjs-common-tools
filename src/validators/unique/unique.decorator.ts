import { registerDecorator, ValidationOptions } from 'class-validator';
import { EntityValidationOptions } from './unique.interface';
import { IS_UNIQUE } from './unique.constant';
import { UniqueConstraint } from './unique.constraint';

export function IsUnique(
  entityType: Function,
  options?: EntityValidationOptions & ValidationOptions,
) {
  const { isUuid, each, property, ...validationOptions } = options || {};

  return function (object: any, propertyName: string) {
    registerDecorator({
      name: IS_UNIQUE,
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [entityType, { isUuid, each, property }],
      validator: UniqueConstraint,
    });
  };
}
