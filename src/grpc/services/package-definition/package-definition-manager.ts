import {
  MethodDefinition,
  PackageDefinition,
  ServiceDefinition,
} from '@grpc/proto-loader';
import { IField, IFoundField, IMessageDefinition } from '../../interfaces';

export class PackageDefinitionManager {
  constructor(
    private readonly packageName: string,
    private readonly packageDefinition: PackageDefinition,
  ) {}

  getPackageName() {
    return this.packageName;
  }

  getServiceDefinition(serviceName: string): ServiceDefinition | undefined {
    return this.packageDefinition[
      `${this.packageName}.${serviceName}`
    ] as ServiceDefinition;
  }

  getMessageDefinition(messageName: string): IMessageDefinition {
    const message = this.packageDefinition[messageName];

    if (!message) {
      return this.packageDefinition[
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
      return undefined;
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
