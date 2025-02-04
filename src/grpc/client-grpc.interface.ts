import { DescriptorProto, FieldDescriptorProto } from 'ts-proto/build/protos';

export interface IGrpcMethod {
  requestType: { type: DescriptorProto };
  responseType: { type: DescriptorProto };
}

export interface IMethodDescriptor {
  request: FieldDescriptorProto[];
  response: FieldDescriptorProto[];
}

interface IStruct {
  fields?: { [k: string]: IValue };
}

interface IListValue {
  values?: IValue[];
}

export interface IValue {
  kind?: string;
  nullValue?: 0;
  numberValue?: number;
  stringValue?: string;
  boolValue?: boolean;
  structValue?: IStruct;
  listValue?: IListValue;
}

export interface StructObject {
  [key: string]: any;
}
