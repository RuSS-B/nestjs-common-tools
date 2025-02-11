import { Test } from '@nestjs/testing';
import { PackageDefinitionService } from './package-definition.service';
import { loadSync, PackageDefinition } from '@grpc/proto-loader';
import { join } from 'path';

describe('PackageDefinitionService', () => {
  let service: PackageDefinitionService;
  let packageDefinition: PackageDefinition;
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
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PackageDefinitionService],
    }).compile();

    service = module.get<PackageDefinitionService>(PackageDefinitionService);
  });

  describe('initialization', () => {
    it('should throw error when not initialized', () => {
      expect(() => service.getManager()).toThrow(
        'PackageDefinitionManager not initialized',
      );
    });

    it('should initialize with package definition', () => {
      service.setPackageDefinition(packageName, packageDefinition);

      expect(service.getManager()).toBeDefined();
    });
  });
});
