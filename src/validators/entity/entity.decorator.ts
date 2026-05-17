import { registerDecorator, ValidationOptions } from 'class-validator';
import { EntityValidationOptions } from './entity.interface';
import { IS_ENTITY } from './entity.constant';
import { EntityConstraint } from './entity.constraint';

/**
 * @deprecated Entity existence checks are not the responsibility of DTO
 * validation. This validator leaks persistence/service concerns into DTOs; keep
 * that logic in the service/application layer instead.
 */
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
