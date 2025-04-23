import { ModuleMetadata } from '@nestjs/common';

export interface S3ModuleOptions {
  region?: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export interface S3ModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<S3ModuleOptions> | S3ModuleOptions;
  global?: boolean;
  inject?: any[];
}
