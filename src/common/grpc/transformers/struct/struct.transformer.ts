import type { IStruct, IValue, StructType } from './struct.interface';

export class StructTransformer {
  static toStruct(obj: object): IStruct {
    const fields: Record<string, IValue> = {};
    Object.entries(obj).forEach(
      ([key, value]) => (fields[key] = StructTransformer.toStructField(value)),
    );

    return {
      fields,
    };
  }

  private static toStructField(value: StructType): IValue {
    if (value === null || value === undefined) {
      return { nullValue: 0 };
    }

    if (typeof value === 'string') {
      return { stringValue: value };
    }

    if (typeof value === 'number') {
      return { numberValue: value };
    }

    if (typeof value === 'boolean') {
      return { boolValue: value };
    }

    if (Array.isArray(value)) {
      return {
        listValue: {
          values: value.map((v) => StructTransformer.toStructField(v)),
        },
      };
    }

    if (typeof value === 'object') {
      return {
        structValue: StructTransformer.toStruct(value),
      };
    }

    return value;
  }

  static toObject(value?: IStruct): object | undefined {
    if (value === undefined || value === null) {
      return value;
    }

    if (StructTransformer.isStruct(value) && value?.fields) {
      const result: Record<string, any> = {};
      Object.entries(value.fields).forEach(
        ([key, value]) => (result[key] = StructTransformer.extractValue(value)),
      );

      return result;
    }

    if (Array.isArray(value)) {
      return value.map((item) => StructTransformer.toObject(item));
    }

    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [key, field] of Object.entries(value)) {
        result[key] = StructTransformer.toObject(field);
      }

      return result;
    }

    return value;
  }

  static isStruct(value: any): boolean {
    return value && typeof value === 'object' && value?.fields;
  }

  private static extractValue(field: IValue): StructType {
    if (field?.stringValue !== undefined) {
      return field.stringValue;
    }

    if (field?.numberValue !== undefined) {
      return field.numberValue;
    }

    if (field?.boolValue !== undefined) {
      return field.boolValue;
    }

    if (field?.structValue !== undefined) {
      return StructTransformer.toObject(field.structValue);
    }

    if (field?.nullValue !== undefined) {
      return null;
    }

    if (field?.listValue) {
      return field.listValue?.values?.map((item: any) =>
        StructTransformer.extractValue(item),
      );
    }

    return null;
  }
}
