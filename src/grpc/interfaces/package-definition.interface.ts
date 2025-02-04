export interface IField {
  name: string;
  extendee: string;
  number: number;
  label: string;
  type: string;
  typeName: string;
}

export interface IMessageTypeDefinition {
  field: IField[]
}

export interface IMessageDefinition {
  type: IMessageTypeDefinition
}

export interface IFoundField {
  name: string;
  fields?: IFoundField[]
}
