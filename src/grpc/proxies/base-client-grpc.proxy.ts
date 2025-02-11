import { ClientGrpcProxy, RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { map } from 'rxjs';
import { IMethodDescriptor, IGrpcMethod } from '../client-grpc.interface';
import type { FieldDescriptorProto } from 'ts-proto/build/protos';
import { StructTransformer } from '../transformers';

export class BaseClientGrpcProxy extends ClientGrpcProxy {
  getService<T extends {}>(name: string): T {
    const service = super.getService(name);

    const packageDefinition = this.getClient(name);

    const methodFields = packageDefinition[name];

    return new Proxy(service, {
      get: (target: any, prop: string) => {
        if (typeof target[prop] !== 'function') {
          return target[prop];
        }

        return (...args: any[]) => {
          const methodName = this.getMethodName(target, prop);
          const fields = this.getMethodFields(methodFields, methodName);

          if (args.length > 0 && args[0] && typeof args[0] === 'object') {
            const dto = args[0];
            const structFields =
              Reflect.getMetadata(
                'IS_GRPC_STRUCT_KEY',
                dto.constructor?.prototype,
              ) || [];

            if (structFields.length) {
              const modified = { ...dto };
              structFields.forEach((field: string) => {
                if (modified[field]) {
                  modified[field] = StructTransformer.toObject(modified[field]);
                }
              });
              args[0] = modified;
            }
          }

          return target[prop].apply(target, args).pipe(
            map((response: any) => {
              const structFields =
                fields.response
                  .filter(
                    (field: FieldDescriptorProto) =>
                      field.typeName === 'google.protobuf.Struct',
                  )
                  .map((f: FieldDescriptorProto) => f.name) || [];

              if (structFields.length) {
                structFields.forEach((field: string) => {
                  response[field] = StructTransformer.toObject(response[field]);
                });
              }

              return response;
            }),
          );
        };
      },
    });
  }

  /*
   * Getting rpc PascalCase method name by comparing it with the camelCase method from NestJS
   */
  private getMethodName(target: any, prop: any): string {
    const methodName = Object.keys(target).find(
      (key) => key.toLowerCase() === prop.toLowerCase() && key !== prop,
    );

    if (!methodName) {
      throw new Error(`Undefined methodName ${prop}`);
    }

    return methodName;
  }

  private getMethodFields(
    service: Record<string, IGrpcMethod>,
    methodName: string,
  ): IMethodDescriptor {
    const method = service?.[methodName];

    return {
      request: method.requestType.type?.field,
      response: method.responseType.type?.field,
    };
  }

  protected serializeError(err: any): any {
    if (err.code === status.UNAVAILABLE) {
      setTimeout(() => process.exit(69), 2000);
    }

    return new RpcException(err);
  }
}
