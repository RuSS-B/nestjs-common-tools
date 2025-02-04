import { Injectable } from '@nestjs/common';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { ReflectionService } from '@grpc/reflection';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PackageDefinition } from '@grpc/proto-loader';
import { GrpcPackageDefinitionService } from '../services';

interface IOptions {
  usePackageDefinitionService?: boolean;
  useReflectionService?: boolean;
  protoDir: string;
  packageName: string;
  url: string;
}

@Injectable()
export class GrpcOptionsProvider {
  constructor(
    private readonly grpcPackageDefinitionService: GrpcPackageDefinitionService,
  ) {}

  getOptions(
    options: IOptions = {
      usePackageDefinitionService: false,
      useReflectionService: true,
      protoDir: join(__dirname, '../../proto'),
      packageName: '',
      url: '0.0.0.0:50051',
    },
  ): GrpcOptions {
    const packageName = options.packageName;

    return {
      transport: Transport.GRPC,
      options: {
        loader: {
          longs: Number,
          arrays: true,
          objects: true,
          includeDirs: [options.protoDir],
        },
        gracefulShutdown: true,
        url: options.url,
        package: packageName,
        protoPath: this.getProtoPath(packageName, options.protoDir),
        onLoadPackageDefinition: (pkg: PackageDefinition, server) => {
          if (options.usePackageDefinitionService) {
            this.grpcPackageDefinitionService.setPackageDefinition(
              pkg,
              packageName,
            );
          }

          if (options.useReflectionService) {
            new ReflectionService(pkg).addToServer(server);
          }
        },
      },
    };
  }

  private getProtoPath(packageName: string, protoDir: string): string[] {
    const fullPath = join(protoDir, packageName);

    return readdirSync(fullPath)
      .filter((f) => f.endsWith('proto'))
      .map((f) => join(fullPath, f));
  }
}
