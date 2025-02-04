import { Injectable, Scope } from '@nestjs/common';
import {
  MethodDefinition,
  PackageDefinition,
  ServiceDefinition,
} from '@grpc/proto-loader';
import {
  IField,
  IFoundField,
  IMessageDefinition,
  IMessageTypeDefinition,
} from '../interfaces';

/**
 * Service for managing and accessing gRPC package definitions.
 * Provides methods to work with services, methods, and their field definitions.
 */
@Injectable({ scope: Scope.DEFAULT })
export class GrpcPackageDefinitionService {
  private packageDefinition: PackageDefinition | null = null;
  private packageName: string;

  setPackageDefinition(pkg: PackageDefinition, packageName: string) {
    this.packageDefinition = pkg;
    this.packageName = packageName;
  }

  getPackageDefinition(): PackageDefinition {
    if (!this.packageDefinition) {
      throw new Error('PackageDefinition not initialized');
    }

    return this.packageDefinition;
  }

  getPackageName(): string {
    if (!this.packageName) {
      throw new Error('PackageDefinition not initialized');
    }

    return this.packageName;
  }

  getServiceDefinition(serviceName: string): ServiceDefinition | undefined {
    const packageDefinition = this.getPackageDefinition();

    return packageDefinition[
      `${this.getPackageName()}.${serviceName}`
    ] as ServiceDefinition;
  }

  getMessageDefinition(messageName: string): IMessageDefinition {
    const packageDefinition = this.getPackageDefinition();

    const message = packageDefinition[messageName];

    if (!message) {
      return packageDefinition[
        `${this.getPackageName()}.${messageName}`
      ] as IMessageDefinition;
    } else {
      return message as IMessageDefinition;
    }
  }

  getMethodDefinition(
    serviceName: string,
    rpc: string,
  ): MethodDefinition<any, any> | undefined {
    const serviceDefinition = this.getServiceDefinition(serviceName);

    if (!serviceDefinition) {
      return serviceDefinition;
    }

    return serviceDefinition[rpc];
  }

  getRequestFields(serviceName: string, rpc: string): IField[] {
    const messageTypeDefinition = this.getMethodDefinition(
      serviceName,
      rpc,
    )?.requestType;

    return this.getFields(messageTypeDefinition as IMessageDefinition);
  }

  getResponseFields(serviceName: string, rpc: string): IField[] {
    const messageTypeDefinition = this.getMethodDefinition(
      serviceName,
      rpc,
    )?.responseType;

    return this.getFields(messageTypeDefinition as IMessageDefinition);
  }

  private getFields(definition?: IMessageDefinition): IField[] {
    return definition?.type?.field || [];
  }

  findFieldsByType(fields: IField[], typeName: string): IFoundField[] {
    return fields
      .filter((f) => f.type === 'TYPE_MESSAGE')
      .map((f) => {
        if (f.typeName === typeName) {
          return { name: f.name };
        }

        return {
          name: f.name,
          fields: this.findFieldsByType(
            this.getFields(this.getMessageDefinition(f.typeName)),
            typeName,
          ),
        };
      })
      .filter((f) => f.fields === undefined || f.fields.length > 0);
  }
}
