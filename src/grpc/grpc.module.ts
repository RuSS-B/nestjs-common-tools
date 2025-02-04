import { Module } from '@nestjs/common';
import { GrpcPackageDefinitionService } from './services';
import { StructInterceptor } from './interceptors';
import { GrpcOptionsProvider } from './providers/grpc-options.provider';

@Module({
  providers: [
    GrpcPackageDefinitionService,
    StructInterceptor,
    GrpcOptionsProvider,
  ],
  exports: [
    GrpcPackageDefinitionService,
    StructInterceptor,
    GrpcOptionsProvider,
  ],
})
export class GrpcModule {}
