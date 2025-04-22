import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3_CLIENT, S3_MODULE_OPTIONS } from './s3.constants';
import { Readable } from 'stream';

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

  async uploadObject(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType = 'application/octet-stream',
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
    });

    try {
      await this.s3Client.send(command);
      this.logger.log(`Uploaded object: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to upload object: ${key}`, error);
      throw error;
    }
  }

  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
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

  async getObject(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
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
