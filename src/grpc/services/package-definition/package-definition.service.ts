import { Injectable, Scope } from '@nestjs/common';
import { PackageDefinition } from '@grpc/proto-loader';
import { PackageDefinitionManager } from './package-definition-manager';

/**
 * Service for managing and accessing gRPC package definitions.
 * Provides methods to work with services, methods, and their field definitions.
 */
@Injectable({ scope: Scope.DEFAULT })
export class PackageDefinitionService {
  private packageDefinitionManager: PackageDefinitionManager;
  private packageName: string;

  setPackageDefinition(packageName: string, pkg: PackageDefinition) {
    this.packageDefinitionManager = new PackageDefinitionManager(
      packageName,
      pkg,
    );
  }

  getManager(): PackageDefinitionManager {
    if (!this.packageDefinitionManager) {
      throw new Error('PackageDefinitionManager not initialized');
    }

    return this.packageDefinitionManager;
  }
}
