import 'reflect-metadata';

export const IS_GRPC_STRUCT_KEY = Symbol('IsGrpcStruct');

export function IsGrpcStruct(): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existingKeys = Reflect.getMetadata(IS_GRPC_STRUCT_KEY, target) || [];
    Reflect.defineMetadata(
      IS_GRPC_STRUCT_KEY,
      [...existingKeys, propertyKey],
      target,
    );
  };
}
