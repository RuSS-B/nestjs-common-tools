import { DynamicModule, Module } from '@nestjs/common';
import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import { S3ModuleAsyncOptions, S3ModuleOptions } from './s3.interface';
import { S3_CLIENT, S3_MODULE_OPTIONS } from './s3.constants';
import { S3Service } from './s3.service';

@Module({})
export class S3Module {
  static forRootAsync(options: S3ModuleAsyncOptions): DynamicModule {
    return {
      module: S3Module,
      imports: options.imports || [],
      global: options.global,
      providers: [
        {
          provide: S3_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        {
          provide: S3_CLIENT,
          inject: [S3_MODULE_OPTIONS],
          useFactory: (opts: S3ModuleOptions) => {
            const clientConfig: S3ClientConfig = {
              region: opts.region || 'us-east-1',
              endpoint: opts.endpoint,
              forcePathStyle: opts.forcePathStyle ?? true,
            };

            return new S3Client(clientConfig);
          },
        },
        S3Service,
      ],
      exports: [S3Service],
    };
  }
}
