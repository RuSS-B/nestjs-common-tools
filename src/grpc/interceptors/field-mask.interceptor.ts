import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

const GOOGLE_PROTOBUF_STRUCT = 'google.protobuf.FieldMask';

@Injectable()
export class FieldMaskInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToRpc().getData();
    const fieldMask = request.fieldMask || request.updateMask;

    if (!fieldMask) {
      return next.handle();
    }

    const paths: string[] = fieldMask.paths || [];
    let reqData: Record<string, any> = {};
    if (paths.length) {
      paths.forEach((field) => (reqData[field] = request?.[field]));
    }

    context.getArgs()[0] = reqData;

    return next.handle();
  }
}
