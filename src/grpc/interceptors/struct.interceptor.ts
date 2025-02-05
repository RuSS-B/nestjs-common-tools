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

        fields.forEach((f) => {
          if (Array.isArray(data[f.name])) {
            data[f.name] = data[f.name].map((v: any) =>
              StructTransformer.toStruct(v),
            );
          } else {
            data[f.name] = StructTransformer.toStruct(data[f.name]);
          }
        });

        return data;
      }),
    );
  }

  private traverseAndTransform(obj: any, fields: IFoundField[]) {
    fields.forEach(
      (f) =>
        (obj[f.name] = f.fields?.length
          ? this.traverseAndTransform(obj[f.name], f.fields)
          : StructTransformer.toObject(obj[f.name])),
    );

    return obj;
  }
}
