import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CopyObjectCommand,
  CopyObjectCommandInput,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
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
  S3CopyObjectOptions,
  S3CopyObjectResult,
  S3DeleteObjectResult,
  S3GetObjectResult,
  S3ListObjectsOptions,
  S3ListObjectsResult,
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

  async copyObject(
    sourceKey: string,
    destinationKey: string,
    options?: S3CopyObjectOptions,
  ): Promise<S3CopyObjectResult> {
    const command = new CopyObjectCommand(
      this.createCopyObjectParams(sourceKey, destinationKey, options),
    );

    try {
      const response = await this.s3Client.send(command);
      this.log(`Copied object: ${sourceKey} -> ${destinationKey}`);

      return response;
    } catch (error) {
      this.logError(
        `Failed to copy object: ${sourceKey} -> ${destinationKey}`,
        error,
      );
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

  async listObjects(
    options?: S3ListObjectsOptions,
  ): Promise<S3ListObjectsResult> {
    const command = new ListObjectsV2Command({
      Bucket: this.resolveBucket(options?.bucket),
      ...(options?.continuationToken
        ? { ContinuationToken: options.continuationToken }
        : {}),
      ...(options?.delimiter ? { Delimiter: options.delimiter } : {}),
      ...(options?.maxKeys ? { MaxKeys: options.maxKeys } : {}),
      ...(options?.prefix ? { Prefix: options.prefix } : {}),
    });

    try {
      const response = await this.s3Client.send(command);
      this.log(`Listed objects for bucket: ${command.input.Bucket}`);

      return response;
    } catch (error) {
      this.logError(
        `Failed to list objects for bucket: ${command.input.Bucket}`,
        error,
      );
      throw error;
    }
  }

  async getSignedUrl(
    key: string,
    options?: S3SignedUrlOptions,
  ): Promise<string> {
    const expiresIn = options?.expiresIn ?? 900;
    const operation = options?.operation ?? 'getObject';
    const s3Client = this.resolveSigningClient(options?.endpoint);

    const command =
      operation === 'putObject'
        ? new PutObjectCommand(this.createPutObjectParams(key, undefined, options))
        : new GetObjectCommand({
            Bucket: this.resolveBucket(options?.bucket),
            Key: key,
          });

    return presignS3Request(s3Client, command, { expiresIn });
  }

  private createCopyObjectParams(
    sourceKey: string,
    destinationKey: string,
    options?: S3CopyObjectOptions,
  ): CopyObjectCommandInput {
    const destinationBucket = this.resolveBucket(options?.bucket);
    const sourceBucket = this.resolveBucket(options?.sourceBucket ?? options?.bucket);
    const shouldReplaceMetadata = !!(
      options?.cacheControl ||
      options?.contentType ||
      options?.metadata
    );
    const metadataDirective =
      options?.metadataDirective ?? (shouldReplaceMetadata ? 'REPLACE' : undefined);

    return {
      Bucket: destinationBucket,
      CopySource: this.buildCopySource(sourceBucket, sourceKey),
      Key: destinationKey,
      ...(options?.acl ? { ACL: options.acl } : {}),
      ...(options?.cacheControl ? { CacheControl: options.cacheControl } : {}),
      ...(options?.contentType ? { ContentType: options.contentType } : {}),
      ...(metadataDirective ? { MetadataDirective: metadataDirective } : {}),
      ...(options?.metadata ? { Metadata: options.metadata } : {}),
    };
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

  private buildCopySource(bucket: string, key: string): string {
    return `${encodeURIComponent(bucket)}/${key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/')}`;
  }

  private resolveBucket(bucket?: string): string {
    const resolvedBucket =
      bucket ?? this.options.defaultBucket ?? this.options.bucket;

    if (!resolvedBucket) {
      throw new Error(
        'S3 bucket is not configured. Pass a bucket to the method call or set S3ModuleOptions.defaultBucket.',
      );
    }

    return resolvedBucket;
  }

  private resolveSigningClient(endpoint?: string): S3Client {
    if (!endpoint || endpoint === this.options.endpoint) {
      return this.s3Client;
    }

    const clientConfig = (this.s3Client as {
      config?: {
        credentials?: S3Client['config']['credentials'];
      };
    }).config;

    return new S3Client({
      region: this.options.region ?? 'us-east-1',
      endpoint,
      forcePathStyle: this.options.forcePathStyle ?? true,
      requestChecksumCalculation: this.options.requestChecksumCalculation,
      responseChecksumValidation: this.options.responseChecksumValidation,
      ...(clientConfig?.credentials ? { credentials: clientConfig.credentials } : {}),
    });
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
