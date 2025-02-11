export interface IFieldDefinition {
  name: string;
  fields?: IFieldDefinition[];
}

export class FieldTransformer {
  /**
   * Recursively traverses an object and applies a transformer function to specific fields
   *
   * @param obj - The object to transform
   * @param fields - Field definitions describing the path to transform
   * @param transformer - Function to apply to the target fields
   * @returns Transformed object
   */
  static traverseAndTransform<T>(
    obj: T,
    fields: IFieldDefinition[],
    transformer: (value: any) => any,
  ): T {
    if (!obj) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        this.traverseAndTransform(item, fields, transformer),
      ) as T;
    }

    const result = { ...obj };

    fields.forEach((f) => {
      const key = f.name as keyof T;

      if (f.fields?.length) {
        result[key] = this.traverseAndTransform(
          result[key],
          f.fields,
          transformer,
        );
      } else {
        result[key] = transformer(result[key]);
      }
    });

    return result;
  }
}
