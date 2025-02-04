import { Injectable } from '@nestjs/common';
import { GrpcOptions, Transport } from '@nestjs/microservices';
import { ReflectionService } from '@grpc/reflection';
import { ConfigService } from '@nestjs/config';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PackageDefinition } from '@grpc/proto-loader';
import { GrpcPackageDefinitionService } from '../services';

interface IOptions {
  usePackageDefinitionService: boolean;
  useReflectionService: boolean;
}

@Injectable()
export class GrpcOptionsProvider {
  constructor(
    private readonly configService: ConfigService,
    private readonly grpcPackageDefinitionService: GrpcPackageDefinitionService,
  ) {}

  getOptions(
    options: IOptions = {
      usePackageDefinitionService: false,
      useReflectionService: true,
    },
  ): GrpcOptions {
    const packageName = this.configService.getOrThrow<string>(
      'GRPC_SERVER_PACKAGE_NAME',
    );

    return {
      transport: Transport.GRPC,
      options: {
        loader: {
          longs: Number,
          arrays: true,
          objects: true,
          includeDirs: [this.getProtoDir()],
        },
        gracefulShutdown: true,
        url: this.configService.getOrThrow<string>('GRPC_SERVER_URL'),
        package: packageName,
        protoPath: this.getProtoPath(packageName),
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

  private getProtoDir() {
    return join(__dirname, '../../proto');
  }

  private getProtoPath(packageName: string): string[] {
    const fullPath = join(this.getProtoDir(), packageName);

    return readdirSync(fullPath)
      .filter((f) => f.endsWith('proto'))
      .map((f) => join(fullPath, f));
  }
}
