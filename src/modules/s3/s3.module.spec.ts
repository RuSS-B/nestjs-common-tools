import { S3Client } from '@aws-sdk/client-s3';
import { DynamicModule } from '@nestjs/common';
import { S3_CLIENT, S3_MODULE_OPTIONS } from './s3.constants';
import { S3Module } from './s3.module';
import { S3ModuleOptions } from './s3.interface';
import { S3Service } from './s3.service';

describe('S3Module', () => {
  it('should preserve async module metadata and export S3Service', () => {
    class ConfigModule {}

    const dynamicModule = S3Module.forRootAsync({
      imports: [ConfigModule],
      global: true,
      inject: ['CONFIG'],
      useFactory: () => ({
        defaultBucket: 'default-bucket',
      }),
    });

    expect(dynamicModule.imports).toEqual([ConfigModule]);
    expect(dynamicModule.global).toBe(true);
    expect(dynamicModule.exports).toEqual([S3Service]);

    const optionsProvider = getProvider(dynamicModule, S3_MODULE_OPTIONS);

    expect(optionsProvider.inject).toEqual(['CONFIG']);
  });

  it('should create an S3 client with safe defaults', async () => {
    const dynamicModule = S3Module.forRootAsync({
      useFactory: () => ({
        endpoint: 'http://localhost:9000',
      }),
    });

    const client = getClientProvider(dynamicModule).useFactory({
      endpoint: 'http://localhost:9000',
    });

    expect(client).toBeInstanceOf(S3Client);
    expect(await client.config.region()).toBe('us-east-1');
    expect(client.config.forcePathStyle).toBe(true);
  });

  it('should allow the AWS SDK to resolve credentials from its default chain', () => {
    const dynamicModule = S3Module.forRootAsync({
      useFactory: () => ({
        endpoint: 'http://localhost:9000',
        defaultBucket: 'default-bucket',
      }),
    });

    const client = getClientProvider(dynamicModule).useFactory({
      endpoint: 'http://localhost:9000',
      defaultBucket: 'default-bucket',
    });

    expect(client).toBeInstanceOf(S3Client);
    expect(typeof client.config.credentials).toBe('function');
  });
});

function getProvider(dynamicModule: DynamicModule, token: string) {
  const provider = dynamicModule.providers?.find(
    (entry) => typeof entry === 'object' && entry?.provide === token,
  );

  if (!provider || typeof provider !== 'object' || !('useFactory' in provider)) {
    throw new Error(`Provider ${token} was not found.`);
  }

  return provider;
}

function getClientProvider(dynamicModule: DynamicModule) {
  return getProvider(dynamicModule, S3_CLIENT) as {
    useFactory: (options: S3ModuleOptions) => S3Client;
  };
}
