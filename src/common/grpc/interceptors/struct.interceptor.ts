import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { StructTransformer } from '../transformers';

@Injectable()
export class StructInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const grpcContext = context.switchToRpc();

    context.getArgs()[0] = this.traverseAndTransform(grpcContext.getData());

    return next.handle();
  }

  private traverseAndTransform(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(this.traverseAndTransform);
    }

    const transformedObj: Record<string, any> = {};
    for (const key in obj) {
      const value = obj[key];

      // Detect google.protobuf.Struct (fields object)
      if (value && StructTransformer.isStruct(value)) {
        transformedObj[key] = StructTransformer.toObject(value);
      } else {
        transformedObj[key] = this.traverseAndTransform(value);
      }
    }

    return transformedObj;
  }
}
