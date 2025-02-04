import type { IStruct, IValue, StructType } from './struct.interface';

export class StructTransformer {
  static fromObjectToStruct(obj: object): IStruct {
    const fields: { key: string; value: IValue }[] = [];
    Object.entries(obj).forEach(([key, value]) => {
      fields.push({
        key,
        value: StructTransformer.toStructField(value),
      });
    });

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
        structValue: StructTransformer.fromObjectToStruct(value),
      };
    }

    return value;
  }

  static fromStructToObject(value?: IStruct): object | undefined {
    if (value === undefined || value === null) {
      return value;
    }

    if (StructTransformer.isStruct(value) && value.fields?.length) {
      const result: Record<string, any> = {};
      for (const f of Object.values(value.fields)) {
        result[f.key] = StructTransformer.extractValue(f.value);
      }

      return result;
    }

    if (Array.isArray(value)) {
      return value.map((item) => StructTransformer.fromStructToObject(item));
    }

    if (typeof value === 'object') {
      const result: Record<string, any> = {};
      for (const [key, field] of Object.entries(value)) {
        result[key] = StructTransformer.fromStructToObject(field);
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
      return StructTransformer.fromStructToObject(field.structValue);
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
