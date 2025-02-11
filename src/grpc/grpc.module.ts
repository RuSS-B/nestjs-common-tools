import { Module } from '@nestjs/common';
import { PackageDefinitionService } from './services/package-definition';
import { StructInterceptor } from './interceptors';
import { GrpcOptionsProvider } from './providers';

@Module({
  providers: [PackageDefinitionService, StructInterceptor, GrpcOptionsProvider],
  exports: [PackageDefinitionService, StructInterceptor, GrpcOptionsProvider],
})
export class GrpcModule {}
