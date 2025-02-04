export interface IStruct {
  fields?: Record<string, IValue>;
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

export type StructType =
  | null
  | undefined
  | string
  | number
  | boolean
  | object
  | [];
