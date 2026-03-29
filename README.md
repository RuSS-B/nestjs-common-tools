# nestjs-common-tools
NestJS Common Tools

A small toolbox for NestJS with helpers that often come up in day-to-day development.

This package grew out of the same recurring problem across multiple projects: there are many standard pieces that are useful in real NestJS applications, but are not available out of the box. Instead of copying those building blocks from project to project, this library collects them in one place to reduce boilerplate and help avoid repeating yourself.

## Installation

Install the package:

```bash
npm install @russ-b/nestjs-common-tools
```

Depending on which features you use, make sure the relevant peer dependencies are also installed in your project.

## Entity Validator

A custom validator for NestJS that validates if an entity exists in the database using TypeORM.

## Setup

1. Register the validator and setup class-validator container in your application:

```typescript
// main.ts
import { useContainer } from 'class-validator';

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
import { TypeOrmModule } from '@nestjs/typeorm';
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
