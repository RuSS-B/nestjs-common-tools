import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { StructTransformer } from '../transformers';
import { GrpcPackageDefinitionService } from '../services';
import { PATTERN_METADATA } from '@nestjs/microservices/constants';
import { IFoundField } from '../interfaces';

const GOOGLE_PROTOBUF_STRUCT = 'google.protobuf.Struct';

@Injectable()
export class StructInterceptor implements NestInterceptor {
  constructor(
    private readonly packageDefinitionService: GrpcPackageDefinitionService,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const grpcContext = context.switchToRpc();
    const { service, rpc } = Reflect.getMetadata(
      PATTERN_METADATA,
      context.getHandler(),
    )[0];

    const protoFields = this.packageDefinitionService.getRequestFields(
      service,
      rpc,
    );
    const fields = this.packageDefinitionService.findFieldsByType(
      protoFields,
      GOOGLE_PROTOBUF_STRUCT,
    );

    context.getArgs()[0] = this.traverseAndTransform(
      grpcContext.getData(),
      fields,
      StructTransformer.toObject,
    );
    return next.handle().pipe(
      map((data: any) => {
        const protoFields = this.packageDefinitionService.getResponseFields(
          service,
          rpc,
        );
        const fields = this.packageDefinitionService.findFieldsByType(
          protoFields,
          GOOGLE_PROTOBUF_STRUCT,
        );

        return this.traverseAndTransform(
          data,
          fields,
          StructTransformer.toStruct,
        );
      }),
    );
  }

  private traverseAndTransform<T>(
    obj: T,
    fields: IFoundField[],
    transformer: (value: any) => any,
  ): T {
    if (!obj) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.traverseAndTransform(item, fields, transformer),
      ) as T;
    }

    const result = { ...obj };

    fields.forEach((f) => {
      const key = f.name as keyof T;

      if (f.fields?.length) {
        result[key] = this.traverseAndTransform(
          result[key],
          f.fields,
          transformer,
        );
      } else {
        result[key] = transformer(result[key]);
      }
    });

    return result;
  }
}
