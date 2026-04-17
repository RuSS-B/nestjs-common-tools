# nestjs-common-tools

A small toolbox for NestJS with helpers that often come up in day-to-day development.

This package grew out of the same recurring problem across multiple projects: there are many standard pieces that are useful in real NestJS applications, but are not available out of the box. Instead of copying those building blocks from project to project, this library collects them in one place to reduce boilerplate and help avoid repeating yourself.

## Installation

Install the package:

```bash
npm install @russ-b/nestjs-common-tools
```

Depending on which features you use, make sure the relevant peer dependencies are also installed in your project.

## Public entrypoints

This package uses subpath exports for most features.

| Import path | What it contains |
|-------------|------------------|
| `@russ-b/nestjs-common-tools` | root exports such as `services` |
| `@russ-b/nestjs-common-tools/class-transformer` | reusable `class-transformer` decorators and helpers |
| `@russ-b/nestjs-common-tools/modules` | NestJS modules such as `S3Module` |
| `@russ-b/nestjs-common-tools/validators` | validation decorators and constraints |
| `@russ-b/nestjs-common-tools/typeorm` | TypeORM filters, helpers, transformers, and types |
| `@russ-b/nestjs-common-tools/logger` | logger builder and logger-related interfaces/types |
| `@russ-b/nestjs-common-tools/pagination` | pagination DTOs, response builders, and errors |
| `@russ-b/nestjs-common-tools/common/util` | generic utility helpers |
| `@russ-b/nestjs-common-tools/common/filters` | shared filter exports |

## Pagination

Import pagination helpers from `@russ-b/nestjs-common-tools/pagination`.

The pagination module includes:

- request DTOs for `page` and `perPage`
- a sortable request DTO with `sortOrder`
- response builders for the standard and legacy response shapes
- a transport-agnostic out-of-range error
- Swagger schema helpers

### Request DTOs

`PaginatedRequestDto` gives you validated pagination query params with sensible defaults:

- `page` defaults to `1`
- `perPage` defaults to `50`
- `perPage` is limited to `1000`
- string query values such as `?page=2&perPage=25` are coerced to numbers

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedRequestDto } from '@russ-b/nestjs-common-tools/pagination';

@Controller('users')
export class UsersController {
  @Get()
  findAll(@Query() query: PaginatedRequestDto) {
    return {
      page: query.page,
      perPage: query.perPage,
      offset: query.offset,
      params: query.getParams(),
    };
  }
}
```

If you also want a sort direction, use `SortablePaginatedRequestDto`:

```typescript
import { SortablePaginatedRequestDto } from '@russ-b/nestjs-common-tools/pagination';

export class UserListQueryDto extends SortablePaginatedRequestDto {}
```

`sortOrder` accepts `asc` or `desc`.

### Building Responses

Use `Pagination.createResponse(...)` for the standard contract with `total` and `pages`.

```typescript
import { Pagination, PaginatedRequestDto } from '@russ-b/nestjs-common-tools/pagination';

async findAll(query: PaginatedRequestDto) {
  const [users, total] = await this.userRepository.findAndCount({
    skip: query.offset,
    take: query.perPage,
  });

  return Pagination.createResponse(query, [users, total]);
}
```

This returns:

```typescript
{
  data: users,
  pagination: {
    total: 125,
    pages: 13,
    page: 1,
    perPage: 10,
  },
}
```

If you still need the old contract with `totalItems` and `totalPages`, use `Pagination.createLegacyResponse(...)`.

### Out-Of-Range Errors

`Pagination.createResponse(...)` and `Pagination.createLegacyResponse(...)` throw a transport-agnostic pagination error when the requested page is out of range.

```typescript
import {
  PAGINATION_OUT_OF_RANGE,
  Pagination,
  PaginationOutOfRangeError,
} from '@russ-b/nestjs-common-tools/pagination';

try {
  return Pagination.createResponse(query, [users, total]);
} catch (error) {
  if (
    error instanceof PaginationOutOfRangeError &&
    error.code === PAGINATION_OUT_OF_RANGE
  ) {
    // map to the transport or framework you use
  }

  throw error;
}
```

## Pagination And Swagger

Generic DTOs such as `PaginationResponseDto<T>` are useful at runtime, but Swagger usually does not infer the concrete `T` item type automatically.

For Swagger/OpenAPI responses, this package exposes explicit schema helpers from `@russ-b/nestjs-common-tools/pagination`.

```typescript
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import {
  createPaginatedResponseSchema,
  PaginationResponseDto,
} from '@russ-b/nestjs-common-tools/pagination';

@ApiExtraModels(UserDto, PaginationResponseDto)
@ApiOkResponse({
  schema: createPaginatedResponseSchema({
    $ref: getSchemaPath(UserDto),
  }),
})
findAll() {
  // ...
}
```

If you still return the legacy pagination shape, use `createLegacyPaginatedResponseSchema(...)` instead.

`PaginationResponseDto` is the standard response DTO with `total` and `pages`.
`LegacyPaginatedResponseDto` preserves the old `totalItems` and `totalPages` shape.
The older `PaginatedResponseDto` name remains only as a deprecated legacy alias.

## Class Transformer Helpers

This package also exposes small reusable decorators for `class-transformer`.

### `ToStringArray`

`ToStringArray()` is useful for DTO query fields that may arrive as a comma-separated string such as `"cars, bikes, boats"` or as an array.

```typescript
import { ToStringArray } from '@russ-b/nestjs-common-tools/class-transformer';

export class SearchDto {
  @ToStringArray()
  tags?: string[];
}
```

It will:

- split string values by comma
- trim extra spaces around items
- remove empty values
- normalize a string like `'cars, bikes, boats'` into `['cars', 'bikes', 'boats']`

### `ToBooleanFromString`

`ToBooleanFromString()` is useful for DTO fields that may arrive as `'true'` or `'false'` strings and should become real booleans.

```typescript
import { ToBooleanFromString } from '@russ-b/nestjs-common-tools/class-transformer';

export class SearchDto {
  @ToBooleanFromString()
  archived?: boolean;
}
```

It will:

- convert `'true'` to `true`
- convert `'false'` to `false`
- trim extra spaces and ignore case
- leave unsupported values unchanged

## S3 Module

`S3Module` is a small NestJS wrapper around the AWS SDK v3 S3 client. It gives you a reusable `S3Service` with a simple Nest-friendly setup for uploads, downloads, deletes, and signed URLs.

### Install S3 peer dependencies

If you want to use the S3 module, install the required AWS peer dependencies in your application:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage @aws-sdk/s3-request-presigner
```

### Register the module

Import the module from `@russ-b/nestjs-common-tools/modules` and configure it with `forRootAsync`.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Module } from '@russ-b/nestjs-common-tools/modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    S3Module.forRootAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        region: config.get<string>('AWS_REGION') ?? 'eu-central-1',
        defaultBucket: config.get<string>('S3_BUCKET'),
        endpoint: config.get<string>('S3_ENDPOINT'),
        logger: config.get<string>('S3_DEBUG') === 'true',
      }),
    }),
  ],
})
export class AppModule {}
```

### Credentials

The module does not accept `accessKeyId` or `secretAccessKey` directly. It relies on the AWS SDK default credential chain instead, which means credentials can come from:

- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- local AWS profiles and shared config
- IAM roles in AWS environments

Example environment variables:

```env
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET=my-app-bucket
```

The AWS SDK reads values from process environment, not directly from a `.env` file, so make sure your application loads those variables before creating the client.

`endpoint` is optional and is mostly useful for S3-compatible providers such as MinIO or LocalStack.

`forcePathStyle` defaults to `true` in this module. That is usually convenient for MinIO and LocalStack. If you want standard AWS virtual-hosted URLs, set `forcePathStyle: false`.

`defaultBucket` is the module-level fallback bucket. You can still override it per method call with `options.bucket`.

### Optional logging

By default, the module stays silent and does not write S3 operation logs.

If you want extra visibility while testing connectivity with S3 or MinIO, set `logger: true` in the module options. That enables the standard Nest logger for this service.

```typescript
S3Module.forRootAsync({
  useFactory: () => ({
    defaultBucket: 'my-app-bucket',
    endpoint: 'http://localhost:9000',
    forcePathStyle: true,
    logger: true,
  }),
});
```

You can also pass your own Nest-compatible logger object if you want to redirect those logs elsewhere.

### Inject and use the service

```typescript
// files.service.ts
import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { S3Service } from '@russ-b/nestjs-common-tools/modules';

@Injectable()
export class FilesService {
  constructor(private readonly s3Service: S3Service) {}

  async putAvatar(key: string, file: Buffer) {
    return this.s3Service.putObject(key, file, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        source: 'avatar-service',
      },
    });
  }

  async uploadLargeFile(key: string, stream: Readable) {
    return this.s3Service.upload(key, stream, {
      contentType: 'application/pdf',
      metadata: {
        source: 'document-service',
      },
    });
  }

  async getAvatar(key: string) {
    const object = await this.s3Service.getObject(key);

    return {
      stream: object.body,
      contentType: object.contentType,
      cacheControl: object.cacheControl,
      metadata: object.metadata,
    };
  }

  async deleteAvatar(key: string) {
    return this.s3Service.deleteObject(key);
  }

  async duplicateAvatar(sourceKey: string, destinationKey: string) {
    return this.s3Service.copyObject(sourceKey, destinationKey);
  }

  async listAvatars() {
    return this.s3Service.listObjects({
      prefix: 'avatars/',
      maxKeys: 50,
    });
  }
}
```

### Signed URLs

Use `getSignedUrl` when the client should upload or download directly from S3.

```typescript
// files.service.ts
async getAvatarUploadUrl(key: string) {
  return this.s3Service.getSignedUrl(key, {
    operation: 'putObject',
    expiresIn: 300,
    contentType: 'image/png',
    cacheControl: 'public, max-age=31536000, immutable',
    metadata: {
      source: 'avatar-upload',
    },
  });
}

async getAvatarDownloadUrl(key: string) {
  return this.s3Service.getSignedUrl(key, {
    operation: 'getObject',
    expiresIn: 300,
  });
}
```

When generating a signed `putObject` URL, make sure the client sends the same headers you used during signing, especially `Content-Type` and any custom metadata headers.

### Available methods

| Method | Description |
|--------|-------------|
| `putObject(key, body, options)` | Simple upload using `PutObjectCommand` |
| `upload(key, body, options)` | Managed upload using `@aws-sdk/lib-storage`, useful for larger or streaming payloads |
| `getObject(key, options)` | Returns the readable stream together with object metadata |
| `deleteObject(key, options)` | Deletes an object from the configured bucket |
| `copyObject(sourceKey, destinationKey, options)` | Copies an object, optionally across buckets |
| `listObjects(options)` | Lists objects with `prefix`, `maxKeys`, `continuationToken`, and `delimiter` support |
| `getSignedUrl(key, options)` | Creates a presigned URL for `getObject` or `putObject` |

`uploadObject` is still available as a compatibility alias, but `putObject` is the preferred method name going forward.

### Inject the raw S3 client

If you need lower-level S3 commands that are not covered by `S3Service`, you can inject the configured AWS client directly.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import {
  DeleteObjectsCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3_CLIENT } from '@russ-b/nestjs-common-tools/modules';

@Injectable()
export class CarPhotoService {
  constructor(
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
  ) {}

  async getPhotoMetadata(key: string) {
    return this.s3Client.send(
      new HeadObjectCommand({
        Bucket: 'car-photos',
        Key: key,
      }),
    );
  }

  async deleteMany(keys: string[]) {
    return this.s3Client.send(
      new DeleteObjectsCommand({
        Bucket: 'car-photos',
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      }),
    );
  }
}
```

## Entity Validator

A custom validator for NestJS that validates if an entity exists in the database using TypeORM.

## Setup

1. Register the validator and setup class-validator container in your application:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  useContainer(app.select(AppModule), { 
    fallbackOnErrors: true 
  });
  
  await app.listen(3000);
}
```

2. Register the validator constraint in your `AppModule`:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { EntityConstraint } from '@russ-b/nestjs-common-tools/validators';

@Module({
  providers: [
    EntityConstraint,
    // other providers
  ]
})
export class AppModule {}
```

## Usage

```typescript
import { IsEntity } from '@russ-b/nestjs-common-tools/validators';

export class UserDto {
  // Validate single entity
  @IsEntity(User)
  userId: string;

  // Validate array of entities
  @IsEntity(Role, { each: true })
  roleIds: string[];

  // Custom property validation
  @IsEntity(User, { property: 'customId' })
  userCustomId: string;

  // Disable UUID validation
  @IsEntity(User, { isUuid: false })
  numericId: number;
}
```

### Options

| Option    | Type      | Default | Description                                  |
|-----------|-----------|---------|----------------------------------------------|
| isUuid    | boolean   | false   | Validate if the value is a valid UUID        |
| each      | boolean   | false   | Apply validation to each item in array       |
| property  | string    | 'id'    | Database property to check against           |

## Example

```typescript
// user.dto.ts
export class AssignRolesDto {
  @IsArray()
  @IsEntity(Role, {
    each: true,
    isUuid: true,
    property: 'id'
  })
  roleIds: string[];
}
```

## TypeORM Exception Filter

When you want to convert low-level database errors into meaningful HTTP responses, a TypeORM exception filter helps keep that logic out of controllers and services. You can register it once and optionally override specific constraints with your own domain-friendly messages.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConflictException } from '@nestjs/common';
import { TypeOrmExceptionFilter } from '@russ-b/nestjs-common-tools/typeorm';

const USER_EMAIL_UNIQUE_INDEX = 'users_email_key';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useFactory: () =>
        new TypeOrmExceptionFilter({
          constraints: {
            [USER_EMAIL_UNIQUE_INDEX]: () =>
              new ConflictException('A user with this email already exists'),
          },
        }),
    },
  ],
})
export class AppModule {}
```

By default, the filter already maps common TypeORM database errors such as unique constraint violations, foreign key violations, and invalid input format to NestJS HTTP exceptions. Custom constraint handlers let you keep those responses specific to your business rules.

## isTypeOrmQueryFailedError

Sometimes a global filter is not enough and you want to react differently to one exact database error inside a service. `isTypeOrmQueryFailedError` is useful for that kind of targeted branching without scattering manual `instanceof QueryFailedError` checks and driver casts around the codebase.

```typescript
import { ConflictException, Injectable } from '@nestjs/common';
import { isTypeOrmQueryFailedError } from '@russ-b/nestjs-common-tools/typeorm';

const OPEN_TICKET_PER_CAR_INDEX = 'open_ticket_per_car_index';

@Injectable()
export class TicketsService {
  async createTicket(payload: CreateTicketDto) {
    try {
      return await this.ticketRepository.save(payload);
    } catch (error) {
      if (
        isTypeOrmQueryFailedError(error, {
          code: '23505',
          constraint: OPEN_TICKET_PER_CAR_INDEX,
        })
      ) {
        throw new ConflictException('This car already has an open ticket');
      }

      throw error;
    }
  }
}
```

The helper can also be used as a plain type guard or with multiple matching fields such as `code`, `constraint`, `table`, or `column`. That makes it a good fit for small pieces of domain-specific error handling where a generic global mapping would be too broad.
