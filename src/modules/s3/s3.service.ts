import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3_CLIENT, S3_MODULE_OPTIONS } from './s3.constants';
import { Readable } from 'stream';
import { Upload } from '@aws-sdk/lib-storage';
import { StreamingBlobPayloadInputTypes } from '@smithy/types/dist-types/streaming-payload/streaming-blob-payload-input-types';
import { UploadParams } from './s3.interface';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(this.constructor.name);
  private readonly bucket: string;

  constructor(
    @Inject(S3_MODULE_OPTIONS) private readonly options: Record<string, string>,
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
  ) {
    this.bucket = this.options.bucket;
  }

  async upload(
    key: string,
    body: StreamingBlobPayloadInputTypes,
    contentType = 'application/octet-stream',
    params?: UploadParams,
  ): Promise<void> {
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: params?.bucket || this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: params?.acl || 'public-read',
      },
    });

    await upload.done();
  }

  async uploadObject(
    key: string,
    body: StreamingBlobPayloadInputTypes,
    contentType = 'application/octet-stream',
    params?: UploadParams,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: params?.bucket || this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: params?.acl || 'public-read',
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Uploaded object: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload object: ${key}`, error);
      throw error;
    }
  }

  async deleteObject(key: string, bucket?: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket || this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Deleted object: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete object: ${key}`, error);
      throw error;
    }
  }

  async getObject(key: string, bucket?: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: bucket || this.bucket,
      Key: key,
    });

    try {
      const response = await this.s3Client.send(command);
      this.logger.log(`Fetched object: ${key}`);

      return response.Body as Readable;
    } catch (error) {
      this.logger.error(`Failed to get object: ${key}`, error);
      throw error;
    }
  }
}
