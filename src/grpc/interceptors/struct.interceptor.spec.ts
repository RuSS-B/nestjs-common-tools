import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { StructInterceptor } from './struct.interceptor';
import { GrpcPackageDefinitionService } from '../services/grpc-package-definition.service';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { loadSync, PackageDefinition } from '@grpc/proto-loader';

describe('StructInterceptor', () => {
  let interceptor: StructInterceptor;
  let packageDefinitionService: GrpcPackageDefinitionService;
  let packageDefinition: PackageDefinition;
  const packageName = 'package_one';

  beforeAll(() => {
    const protoDir = join(__dirname, '../../../test/protos/');
    const protoPath = [
      join(protoDir, 'package_one/struct_one.proto'),
      join(protoDir, 'package_two/struct_two.proto'),
    ];
    packageDefinition = loadSync(protoPath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [protoDir],
    });
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [StructInterceptor, GrpcPackageDefinitionService],
    }).compile();

    interceptor = moduleRef.get<StructInterceptor>(StructInterceptor);
    packageDefinitionService = moduleRef.get<GrpcPackageDefinitionService>(
      GrpcPackageDefinitionService,
    );

    packageDefinitionService.setPackageDefinition(
      packageDefinition,
      packageName,
    );
  });

  it('should transform Struct fields in request and response', (done) => {
    const requestData = {
      title: 'test',
      settings: {
        fields: {
          theme: { stringValue: 'dark' },
          fontSize: { numberValue: 14 },
        },
      },
    };

    const expectedTransformedRequest = {
      title: 'test',
      settings: {
        theme: 'dark',
        fontSize: 14,
      },
    };

    const args = [requestData];
    const executionContext = {
      switchToRpc: () => ({
        getData: () => requestData,
      }),
      getHandler: () => ({}),
      getArgs: () => args,
    } as unknown as ExecutionContext;

    jest
      .spyOn(Reflect, 'getMetadata')
      .mockReturnValue([{ service: 'TestService', rpc: 'SimpleNested' }]);

    const next: CallHandler = {
      handle: () => of({}),
    };

    interceptor.intercept(executionContext, next);
    expect(args[0]).toEqual(expectedTransformedRequest);
    done();
  });

  it('should transform response plain object to Struct', (done) => {
    const responseData = {
      title: 'test',
      settings: {
        theme: 'dark',
        fontSize: 14,
      },
    };

    const expectedTransformedResponse = {
      title: 'test',
      settings: {
        fields: {
          theme: { stringValue: 'dark' },
          fontSize: { numberValue: 14 },
        },
      },
    };

    const executionContext = {
      switchToRpc: () => ({
        getData: () => ({}),
      }),
      getHandler: () => ({}),
      getArgs: () => [{}],
    } as unknown as ExecutionContext;

    jest
      .spyOn(Reflect, 'getMetadata')
      .mockReturnValue([{ service: 'TestService', rpc: 'SimpleNested' }]);

    const next: CallHandler = {
      handle: () => of(responseData),
    };

    interceptor.intercept(executionContext, next).subscribe({
      next: (result) => {
        expect(result).toEqual(expectedTransformedResponse);
        done();
      },
      error: (error) => {
        done(error);
      },
    });
  });
});
