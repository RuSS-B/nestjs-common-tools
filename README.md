# nestjs-common-tools
NestJS Common Tools

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
import { EntityConstraint } from './common/validators/entity/entity.constraint';

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
import { IsEntity } from '@russ-b/nestjs-common-tools/common/validators/entity';

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
