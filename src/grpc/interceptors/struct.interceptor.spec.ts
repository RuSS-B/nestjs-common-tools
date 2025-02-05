import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { StructInterceptor } from './struct.interceptor';
import { GrpcPackageDefinitionService } from '../services';
import { Test } from '@nestjs/testing';
import { join } from 'path';
import { loadSync, PackageDefinition } from '@grpc/proto-loader';

describe('StructInterceptor', () => {
  let interceptor: StructInterceptor;
  let packageDefinitionService: GrpcPackageDefinitionService;
  let packageDefinition: PackageDefinition;
  const packageName = 'package_one';
  const serviceName = 'TestService';

  const getExecutionContext = (requestData: any) => {
    const args = [requestData];
    return {
      switchToRpc: () => ({
        getData: () => requestData,
      }),
      getHandler: () => ({}),
      getArgs: () => args,
    } as unknown as ExecutionContext;
  };

  const mockGrpcMetadata = (service: string, rpc: string) => {
    jest.spyOn(Reflect, 'getMetadata').mockReturnValue([{ service, rpc }]);
  };

  beforeAll(async () => {
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

    const executionContext = getExecutionContext(requestData);
    mockGrpcMetadata(serviceName, 'SimpleNested');

    const next: CallHandler = {
      handle: () => of({}),
    };

    interceptor.intercept(executionContext, next);
    expect(executionContext.getArgs()[0]).toEqual(expectedTransformedRequest);
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

    const executionContext = getExecutionContext({});
    mockGrpcMetadata(serviceName, 'SimpleNested');

    const next: CallHandler = {
      handle: () => of(responseData),
    };

    interceptor.intercept(executionContext, next).subscribe({
      next: (result) => {
        try {
          expect(result).toEqual(expectedTransformedResponse);
          done();
        } catch (error) {
          done(error);
        }
      },
      error: (error) => done(error),
    });
  });

  it('should not transform fields when no Structs are present', (done) => {
    const normalData = {
      name: 'test name',
      value: 42,
    };

    const executionContext = getExecutionContext(normalData);
    mockGrpcMetadata(serviceName, 'ProcessSimple');

    const next: CallHandler = {
      handle: () => of(normalData),
    };

    interceptor.intercept(executionContext, next).subscribe({
      next: (result) => {
        try {
          expect(result).toEqual(normalData);
          done();
        } catch (error) {
          done(error);
        }
      },
      error: (error) => done(error),
    });
  });

  it('should not transform when an array in response', (done) => {
    const normalData = {
      name: 'test name',
      value: 42,
    };

    const data = [normalData, normalData, normalData];

    const executionContext = getExecutionContext(data);

    jest
      .spyOn(Reflect, 'getMetadata')
      .mockReturnValue([{ service: 'TestService', rpc: 'ProcessSimpleArray' }]);

    const next: CallHandler = {
      handle: () => of({ data }),
    };

    interceptor.intercept(executionContext, next).subscribe({
      next: (result) => {
        try {
          expect(result).toEqual({ data });
          done();
        } catch (error) {
          done(error);
        }
      },
      error: (error) => done(error),
    });
  });

  it('should not transform anything if there is no field', (done) => {
    const responseData = {
      data: [],
    };

    const executionContext = getExecutionContext({});
    mockGrpcMetadata(serviceName, 'ProcessNestedArray');

    const next: CallHandler = {
      handle: () => of({ data: [] }),
    };

    interceptor.intercept(executionContext, next).subscribe({
      next: (result) => {
        try {
          expect(result).toEqual(responseData);
          done();
        } catch (error) {
          done(error);
        }
      },
      error: (error) => done(error),
    });
  });
});
