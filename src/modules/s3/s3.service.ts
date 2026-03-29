import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presignS3Request } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { Upload } from '@aws-sdk/lib-storage';
import { S3_CLIENT, S3_MODULE_OPTIONS } from './s3.constants';
import {
  S3Body,
  S3DeleteObjectResult,
  S3GetObjectResult,
  S3ModuleLogger,
  S3ModuleOptions,
  S3ObjectOptions,
  S3PutObjectResult,
  S3SignedUrlOptions,
  S3UploadOptions,
  S3UploadResult,
} from './s3.interface';

@Injectable()
export class S3Service {
  private readonly logger?: S3ModuleLogger;

  constructor(
    @Inject(S3_MODULE_OPTIONS) private readonly options: S3ModuleOptions,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
  ) {
    this.logger =
      options.logger === true ? new Logger(S3Service.name) : options.logger || undefined;
  }

  async upload(
    key: string,
    body: S3Body,
    options?: S3UploadOptions,
  ): Promise<S3UploadResult> {
    const upload = new Upload({
      client: this.s3Client,
      params: this.createPutObjectParams(key, body, options, true),
    });

    const response = await upload.done();
    this.log(`Uploaded object with multipart upload: ${key}`);

    return response;
  }

  async putObject(
    key: string,
    body: S3Body,
    options?: S3UploadOptions,
  ): Promise<S3PutObjectResult> {
    const command = new PutObjectCommand(
      this.createPutObjectParams(key, body, options, true),
    );

    try {
      const response = await this.s3Client.send(command);
      this.log(`Uploaded object: ${key}`);

      return response;
    } catch (error) {
      this.logError(`Failed to upload object: ${key}`, error);
      throw error;
    }
  }

  async uploadObject(
    key: string,
    body: S3Body,
    options?: S3UploadOptions,
  ): Promise<S3PutObjectResult> {
    return this.putObject(key, body, options);
  }

  async deleteObject(
    key: string,
    options?: S3ObjectOptions,
  ): Promise<S3DeleteObjectResult> {
    const command = new DeleteObjectCommand({
      Bucket: this.resolveBucket(options?.bucket),
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      this.log(`Deleted object: ${key}`);

      return response;
    } catch (error) {
      this.logError(`Failed to delete object: ${key}`, error);
      throw error;
    }
  }

  async getObject(
    key: string,
    options?: S3ObjectOptions,
  ): Promise<S3GetObjectResult> {
    const command = new GetObjectCommand({
      Bucket: this.resolveBucket(options?.bucket),
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      this.log(`Fetched object: ${key}`);

      if (!response.Body) {
        throw new Error(`S3 object "${key}" returned an empty body.`);
      }

      if (!(response.Body instanceof Readable)) {
        throw new Error(
          `S3 object "${key}" did not return a Node.js readable stream.`,
        );
      }

      return {
        body: response.Body,
        cacheControl: response.CacheControl,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        eTag: response.ETag,
        lastModified: response.LastModified,
        metadata: response.Metadata,
      };
    } catch (error) {
      this.logError(`Failed to get object: ${key}`, error);
      throw error;
    }
  }

  async getSignedUrl(
    key: string,
    options?: S3SignedUrlOptions,
  ): Promise<string> {
    const expiresIn = options?.expiresIn ?? 900;
    const operation = options?.operation ?? 'getObject';

    const command =
      operation === 'putObject'
        ? new PutObjectCommand(this.createPutObjectParams(key, undefined, options))
        : new GetObjectCommand({
            Bucket: this.resolveBucket(options?.bucket),
            Key: key,
          });

    return presignS3Request(this.s3Client, command, { expiresIn });
  }

  private createPutObjectParams(
    key: string,
    body?: S3Body,
    options?: S3UploadOptions,
    useDefaultContentType = false,
  ): PutObjectCommandInput {
    const contentType =
      options?.contentType ??
      (useDefaultContentType ? 'application/octet-stream' : undefined);

    return {
      Bucket: this.resolveBucket(options?.bucket),
      Key: key,
      ...(body !== undefined ? { Body: body } : {}),
      ...(contentType ? { ContentType: contentType } : {}),
      ...(options?.acl ? { ACL: options.acl } : {}),
      ...(options?.cacheControl ? { CacheControl: options.cacheControl } : {}),
      ...(options?.metadata ? { Metadata: options.metadata } : {}),
    };
  }

  private resolveBucket(bucket?: string): string {
    const resolvedBucket = bucket ?? this.options.bucket;

    if (!resolvedBucket) {
      throw new Error(
        'S3 bucket is not configured. Pass a bucket to the method call or set S3ModuleOptions.bucket.',
      );
    }

    return resolvedBucket;
  }

  private log(message: string): void {
    this.logger?.log(message);
  }

  private logError(message: string, error: unknown): void {
    if (!this.logger) {
      return;
    }

    if (error instanceof Error) {
      this.logger.error(message, error.stack ?? error.message);
      return;
    }

    this.logger.error(message, error);
  }
}
