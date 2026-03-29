import type { LoggerService, ModuleMetadata } from '@nestjs/common';
import type {
  DeleteObjectCommandOutput,
  GetObjectCommandOutput,
  ObjectCannedACL,
  PutObjectCommandInput,
  PutObjectCommandOutput,
} from '@aws-sdk/client-s3';
import type { CompleteMultipartUploadCommandOutput } from '@aws-sdk/client-s3';
import type { Readable } from 'stream';

export type S3ModuleLogger = Pick<LoggerService, 'log' | 'error'>;

export interface S3ModuleOptions {
  region?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  bucket?: string;
  logger?: boolean | S3ModuleLogger;
}

export interface S3ModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useFactory: (...args: any[]) => Promise<S3ModuleOptions> | S3ModuleOptions;
  global?: boolean;
  inject?: any[];
}

export interface S3ObjectOptions {
  bucket?: string;
}

export interface S3UploadOptions extends S3ObjectOptions {
  acl?: ObjectCannedACL;
  cacheControl?: PutObjectCommandInput['CacheControl'];
  contentType?: NonNullable<PutObjectCommandInput['ContentType']>;
  metadata?: PutObjectCommandInput['Metadata'];
}

export interface S3SignedUrlOptions extends S3UploadOptions {
  expiresIn?: number;
  operation?: 'getObject' | 'putObject';
}

export interface S3GetObjectResult {
  body: Readable;
  cacheControl?: GetObjectCommandOutput['CacheControl'];
  contentLength?: GetObjectCommandOutput['ContentLength'];
  contentType?: GetObjectCommandOutput['ContentType'];
  eTag?: GetObjectCommandOutput['ETag'];
  lastModified?: GetObjectCommandOutput['LastModified'];
  metadata?: GetObjectCommandOutput['Metadata'];
}

export type S3UploadResult = CompleteMultipartUploadCommandOutput;
export type S3PutObjectResult = PutObjectCommandOutput;
export type S3DeleteObjectResult = DeleteObjectCommandOutput;
export type S3Body = NonNullable<PutObjectCommandInput['Body']>;
export type UploadParams = S3UploadOptions;
