import { ModuleMetadata } from '@nestjs/common';
import { ObjectCannedACL } from '@aws-sdk/client-s3';

export interface S3ModuleOptions {
  region?: string;
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  bucket?: string;
}

export interface S3ModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<S3ModuleOptions> | S3ModuleOptions;
  global?: boolean;
  inject?: any[];
}

export interface UploadParams {
  bucket?: string;
  acl?: ObjectCannedACL;
}
