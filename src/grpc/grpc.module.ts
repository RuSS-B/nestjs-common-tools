import { Module } from '@nestjs/common';
import { GrpcPackageDefinitionService } from './services/grpc-package-definition.service';
import { StructInterceptor } from './interceptors';

@Module({
  providers: [GrpcPackageDefinitionService, StructInterceptor],
  exports: [GrpcPackageDefinitionService, StructInterceptor],
})
export class GrpcModule {}
