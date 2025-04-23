import { DynamicModule, Module } from '@nestjs/common';
import { S3Service } from './s3.service';
import { S3_CLIENT, S3_MODULE_OPTIONS } from './s3.constants';
import { S3Client } from '@aws-sdk/client-s3';
import { S3ModuleAsyncOptions, S3ModuleOptions } from './s3.interface';

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
            return new S3Client({
              region: opts.region || 'us-east-1',
              endpoint: opts.endpoint,
              credentials: {
                accessKeyId: opts.accessKeyId,
                secretAccessKey: opts.secretAccessKey,
              },
              forcePathStyle: opts.forcePathStyle ?? true,
            });
          },
        },
        S3Service,
      ],
      exports: [S3Service],
    };
  }
}
