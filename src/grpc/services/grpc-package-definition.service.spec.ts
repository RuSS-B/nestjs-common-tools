import { Test } from '@nestjs/testing';
import { GrpcPackageDefinitionService } from './grpc-package-definition.service';
import { loadSync, PackageDefinition } from '@grpc/proto-loader';
import { join } from 'path';

describe('GrpcPackageDefinitionService', () => {
  let service: GrpcPackageDefinitionService;
  let packageDefinition: PackageDefinition;
  const serviceName = 'TestService';
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
      includeDirs: [protoDir]
    });
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GrpcPackageDefinitionService],
    }).compile();

    service = module.get<GrpcPackageDefinitionService>(
      GrpcPackageDefinitionService,
    );
  });

  describe('initialization', () => {
    it('should throw error when not initialized', () => {
      expect(() => service.getPackageDefinition()).toThrow(
        'PackageDefinition not initialized',
      );
      expect(() => service.getPackageName()).toThrow(
        'PackageDefinition not initialized',
      );
    });

    it('should initialize with package definition', () => {
      service.setPackageDefinition(packageDefinition, packageName);

      expect(service.getPackageDefinition()).toBeDefined();
      expect(service.getPackageName()).toBe(packageName);
    });
  });

  describe('service and method definitions', () => {
    beforeEach(() => {
      service.setPackageDefinition(packageDefinition, packageName);
    });

    it('should get service definition', () => {
      const serviceDefinition = service.getServiceDefinition(serviceName);
      expect(serviceDefinition).toBeDefined();
    });

    it('should return undefined for non-existent service', () => {
      const serviceDefinition = service.getServiceDefinition('NonExistent');
      expect(serviceDefinition).toBeUndefined();
    });

    it('should get method definition', () => {
      const methodDef = service.getMethodDefinition(
        serviceName,
        'ProcessNested',
      );
      expect(methodDef).toBeDefined();
      expect(methodDef?.requestType).toBeDefined();
    });

    it('should return undefined for non-existent method', () => {
      const methodDef = service.getMethodDefinition(serviceName, 'NonExistent');
      expect(methodDef).toBeUndefined();
    });
  });

  describe('field extraction', () => {
    beforeEach(() => {
      service.setPackageDefinition(packageDefinition, packageName);
    });

    it('should extract request fields', () => {
      const fields = service.getRequestFields(serviceName, 'ProcessNested');
      const fieldNames = fields.map((f) => f.name);
      expect(fieldNames).toContain('metadata');
    });

    it('should extract response fields', () => {
      const fields = service.getResponseFields(serviceName, 'ProcessNested');
      const fieldNames = fields.map((f) => f.name);
      expect(fieldNames).toContain('metadata');
    });

    it('should find fields by type', () => {
      const requestFields = service.getRequestFields(
        serviceName,
        'ProcessNested',
      );
      const structFields = service.findFieldsByType(
        requestFields,
        'google.protobuf.Struct',
      );
      expect(structFields).toEqual([
        {name: 'metadata'},
        {name: 'items'},
        {name: 'nested', fields: [{name: 'config'}] },
        {name: 'external_nested', fields : [{name: 'config'}] }
      ]);
    });

    it('should return empty array for non-existent fields', () => {
      const fields = service.getRequestFields('NonExistent', 'NonExistent');
      expect(fields).toEqual([]);
    });
  });
});
