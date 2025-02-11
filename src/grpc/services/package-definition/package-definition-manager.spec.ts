import { loadSync, PackageDefinition } from '@grpc/proto-loader';
import { join } from 'path';
import { PackageDefinitionManager } from './package-definition-manager';

describe('PackageDefinitionManager', () => {
  let manager: PackageDefinitionManager;
  let packageDefinition: PackageDefinition;
  const serviceName = 'TestService';
  const packageName = 'package_one';

  beforeAll(() => {
    const protoDir = join(__dirname, '../../../../test/protos/');
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

    manager = new PackageDefinitionManager(packageName, packageDefinition);
  });

  describe('service and method definitions', () => {
    it('should get service definition', () => {
      const serviceDefinition = manager.getServiceDefinition(serviceName);
      expect(serviceDefinition).toBeDefined();
    });

    it('should return undefined for non-existent service', () => {
      const serviceDefinition = manager.getServiceDefinition('NonExistent');
      expect(serviceDefinition).toBeUndefined();
    });

    it('should get method definition', () => {
      const methodDef = manager.getMethodDefinition(
        serviceName,
        'ProcessNested',
      );
      expect(methodDef).toBeDefined();
      expect(methodDef?.requestType).toBeDefined();
    });

    it('should return undefined for non-existent method', () => {
      const methodDef = manager.getMethodDefinition(serviceName, 'NonExistent');
      expect(methodDef).toBeUndefined();
    });
  });

  describe('field extraction', () => {
    it('should extract request fields', () => {
      const fields = manager.getRequestFields(serviceName, 'ProcessNested');
      const fieldNames = fields.map((f) => f.name);
      expect(fieldNames).toContain('metadata');
    });

    it('should extract response fields', () => {
      const fields = manager.getResponseFields(serviceName, 'ProcessNested');
      const fieldNames = fields.map((f) => f.name);
      expect(fieldNames).toContain('metadata');
    });

    it('should not count array fields if there are no structs', () => {
      const fields = manager.getResponseFields(
        serviceName,
        'ProcessSimpleArray',
      );

      const structFields = manager.findFieldsByType(
        fields,
        'google.protobuf.Struct',
      );

      expect(structFields).toHaveLength(0);
    });

    it('should find fields by type', () => {
      const requestFields = manager.getRequestFields(
        serviceName,
        'ProcessNested',
      );
      const structFields = manager.findFieldsByType(
        requestFields,
        'google.protobuf.Struct',
      );
      expect(structFields).toEqual([
        { name: 'metadata' },
        { name: 'items' },
        { name: 'nested', fields: [{ name: 'settings' }] },
        { name: 'external_nested', fields: [{ name: 'config' }] },
      ]);
    });

    it('should return empty array for non-existent fields', () => {
      const fields = manager.getRequestFields('NonExistent', 'NonExistent');
      expect(fields).toEqual([]);
    });
  });
});
