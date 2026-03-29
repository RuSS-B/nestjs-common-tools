import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Logger } from '@nestjs/common';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl as presignS3Request } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { S3ModuleOptions } from './s3.interface';
import { S3Service } from './s3.service';

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn(),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('S3Service', () => {
  const UploadMock = Upload as jest.MockedClass<typeof Upload>;
  const presignMock = presignS3Request as jest.MockedFunction<
    typeof presignS3Request
  >;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    UploadMock.mockReset();
    presignMock.mockReset();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should upload with metadata and cache control without assigning a public ACL by default', async () => {
    const response = { ETag: '"multipart-etag"' };
    const done = jest.fn().mockResolvedValue(response);
    const service = createService();

    UploadMock.mockImplementation(() => ({ done }) as never);

    await expect(
      service.upload('avatar.png', 'payload', {
        contentType: 'image/png',
        cacheControl: 'public, max-age=3600',
        metadata: {
          source: 'unit-test',
        },
      }),
    ).resolves.toBe(response);

    expect(UploadMock).toHaveBeenCalledTimes(1);
    expect(UploadMock.mock.calls[0][0]).toMatchObject({
      client: expect.any(Object),
      params: {
        Bucket: 'default-bucket',
        Key: 'avatar.png',
        Body: 'payload',
        ContentType: 'image/png',
        CacheControl: 'public, max-age=3600',
        Metadata: {
          source: 'unit-test',
        },
      },
    });
    expect(UploadMock.mock.calls[0][0].params.ACL).toBeUndefined();
    expect(done).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('should forward explicit bucket, ACL, metadata and cache control for putObject uploads', async () => {
    const response = { ETag: '"put-etag"' };
    const send = jest.fn().mockResolvedValue(response);
    const service = createService({ defaultBucket: 'ignored-bucket' }, send);

    await expect(
      service.putObject('avatar.png', 'payload', {
        bucket: 'custom-bucket',
        acl: 'private',
        contentType: 'image/png',
        cacheControl: 'private, max-age=60',
        metadata: {
          source: 'unit-test',
        },
      }),
    ).resolves.toBe(response);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'custom-bucket',
      Key: 'avatar.png',
      Body: 'payload',
      ContentType: 'image/png',
      ACL: 'private',
      CacheControl: 'private, max-age=60',
      Metadata: {
        source: 'unit-test',
      },
    });
  });

  it('should keep uploadObject as an alias for putObject', async () => {
    const response = { ETag: '"alias-etag"' };
    const send = jest.fn().mockResolvedValue(response);
    const service = createService({ defaultBucket: 'default-bucket' }, send);

    await expect(
      service.uploadObject('avatar.png', 'payload', {
        contentType: 'image/png',
      }),
    ).resolves.toBe(response);
  });

  it('should throw a clear error when bucket is missing', async () => {
    const send = jest.fn();
    const service = createService({}, send);

    await expect(service.putObject('avatar.png', 'payload')).rejects.toThrow(
      'S3 bucket is not configured',
    );
    expect(send).not.toHaveBeenCalled();
  });

  it('should use the resolved bucket for deletions', async () => {
    const response = { DeleteMarker: true };
    const send = jest.fn().mockResolvedValue(response);
    const service = createService({ defaultBucket: 'default-bucket' }, send);

    await expect(
      service.deleteObject('avatar.png', { bucket: 'archive-bucket' }),
    ).resolves.toBe(response);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'archive-bucket',
      Key: 'avatar.png',
    });
  });

  it('should copy an object with the configured default bucket', async () => {
    const response = { CopyObjectResult: { ETag: '"copy-etag"' } };
    const send = jest.fn().mockResolvedValue(response);
    const service = createService({ defaultBucket: 'default-bucket' }, send);

    await expect(
      service.copyObject('source/avatar old.png', 'target/avatar new.png'),
    ).resolves.toBe(response);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(CopyObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'default-bucket',
      CopySource: 'default-bucket/source/avatar%20old.png',
      Key: 'target/avatar new.png',
    });
  });

  it('should support explicit source and destination buckets for copyObject', async () => {
    const response = { CopyObjectResult: { ETag: '"copy-etag"' } };
    const send = jest.fn().mockResolvedValue(response);
    const service = createService({ defaultBucket: 'default-bucket' }, send);

    await expect(
      service.copyObject('source/avatar.png', 'target/avatar.png', {
        bucket: 'target-bucket',
        sourceBucket: 'source-bucket',
        contentType: 'image/png',
        cacheControl: 'public, max-age=3600',
        metadata: {
          source: 'unit-test',
        },
      }),
    ).resolves.toBe(response);

    expect(send.mock.calls[0][0]).toBeInstanceOf(CopyObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'target-bucket',
      CopySource: 'source-bucket/source/avatar.png',
      Key: 'target/avatar.png',
      ContentType: 'image/png',
      CacheControl: 'public, max-age=3600',
      MetadataDirective: 'REPLACE',
      Metadata: {
        source: 'unit-test',
      },
    });
  });

  it('should return a readable stream for getObject', async () => {
    const stream = Readable.from(['payload']);
    const lastModified = new Date('2026-03-29T19:00:00.000Z');
    const send = jest.fn().mockResolvedValue({
      Body: stream,
      CacheControl: 'private, max-age=60',
      ContentLength: 7,
      ContentType: 'image/png',
      ETag: '"get-etag"',
      LastModified: lastModified,
      Metadata: {
        source: 'unit-test',
      },
    });
    const service = createService({ defaultBucket: 'default-bucket' }, send);

    await expect(service.getObject('avatar.png')).resolves.toEqual({
      body: stream,
      cacheControl: 'private, max-age=60',
      contentLength: 7,
      contentType: 'image/png',
      eTag: '"get-etag"',
      lastModified,
      metadata: {
        source: 'unit-test',
      },
    });
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'default-bucket',
      Key: 'avatar.png',
    });
  });

  it('should fail when getObject returns no body', async () => {
    const send = jest.fn().mockResolvedValue({ Body: undefined });
    const service = createService({ defaultBucket: 'default-bucket' }, send);

    await expect(service.getObject('avatar.png')).rejects.toThrow(
      'returned an empty body',
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('should list objects with pagination-friendly options', async () => {
    const response = {
      Contents: [{ Key: 'avatars/one.png' }],
      IsTruncated: true,
      NextContinuationToken: 'next-token',
    };
    const send = jest.fn().mockResolvedValue(response);
    const service = createService({ defaultBucket: 'default-bucket' }, send);

    await expect(
      service.listObjects({
        prefix: 'avatars/',
        maxKeys: 25,
        continuationToken: 'current-token',
        delimiter: '/',
      }),
    ).resolves.toBe(response);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toBeInstanceOf(ListObjectsV2Command);
    expect(send.mock.calls[0][0].input).toEqual({
      Bucket: 'default-bucket',
      Prefix: 'avatars/',
      MaxKeys: 25,
      ContinuationToken: 'current-token',
      Delimiter: '/',
    });
  });

  it('should generate a signed getObject URL by default', async () => {
    const service = createService();
    presignMock.mockResolvedValue('https://signed.example.com/download');

    await expect(service.getSignedUrl('avatar.png')).resolves.toBe(
      'https://signed.example.com/download',
    );

    expect(presignMock).toHaveBeenCalledTimes(1);
    expect(presignMock.mock.calls[0][1]).toBeInstanceOf(GetObjectCommand);
    expect((presignMock.mock.calls[0][1] as GetObjectCommand).input).toEqual({
      Bucket: 'default-bucket',
      Key: 'avatar.png',
    });
    expect(presignMock.mock.calls[0][2]).toEqual({ expiresIn: 900 });
  });

  it('should generate a signed putObject URL with upload headers', async () => {
    const service = createService();
    presignMock.mockResolvedValue('https://signed.example.com/upload');

    await expect(
      service.getSignedUrl('avatar.png', {
        operation: 'putObject',
        expiresIn: 60,
        contentType: 'image/png',
        cacheControl: 'public, max-age=3600',
        metadata: {
          source: 'unit-test',
        },
        acl: 'private',
      }),
    ).resolves.toBe('https://signed.example.com/upload');

    expect(presignMock).toHaveBeenCalledTimes(1);
    expect(presignMock.mock.calls[0][1]).toBeInstanceOf(PutObjectCommand);
    expect((presignMock.mock.calls[0][1] as PutObjectCommand).input).toEqual({
      Bucket: 'default-bucket',
      Key: 'avatar.png',
      ContentType: 'image/png',
      CacheControl: 'public, max-age=3600',
      Metadata: {
        source: 'unit-test',
      },
      ACL: 'private',
    });
    expect(presignMock.mock.calls[0][2]).toEqual({ expiresIn: 60 });
  });

  it('should log operations when logger is enabled', async () => {
    const send = jest.fn().mockResolvedValue({ ETag: '"put-etag"' });
    const service = createService(
      {
        defaultBucket: 'default-bucket',
        logger: true,
      },
      send,
    );

    await service.putObject('avatar.png', 'payload');

    expect(logSpy).toHaveBeenCalledWith('Uploaded object: avatar.png');
  });

  it('should use a custom logger when provided', async () => {
    const send = jest.fn().mockRejectedValue(new Error('boom'));
    const logger = {
      log: jest.fn(),
      error: jest.fn(),
    };
    const service = createService(
      {
        defaultBucket: 'default-bucket',
        logger,
      },
      send,
    );

    await expect(service.putObject('avatar.png', 'payload')).rejects.toThrow(
      'boom',
    );

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.error.mock.calls[0][0]).toBe(
      'Failed to upload object: avatar.png',
    );
  });

  it('should still support the deprecated module bucket option as a fallback', async () => {
    const response = { ETag: '"legacy-etag"' };
    const send = jest.fn().mockResolvedValue(response);
    const service = createService({ bucket: 'legacy-bucket' }, send);

    await service.putObject('avatar.png', 'payload');

    expect(send.mock.calls[0][0]).toBeInstanceOf(PutObjectCommand);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'legacy-bucket',
      Key: 'avatar.png',
    });
  });
});

function createService(
  options: S3ModuleOptions = { defaultBucket: 'default-bucket' },
  send = jest.fn(),
): S3Service {
  return new S3Service(
    options,
    {
      send,
    } as unknown as S3Client,
  );
}
