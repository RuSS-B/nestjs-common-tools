export interface IStruct {
  fields?: IStructItem[];
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

interface IStructItem {
  key: string;
  value: IValue;
}

export type StructType =
  | null
  | undefined
  | string
  | number
  | boolean
  | object
  | 0
  | [];
