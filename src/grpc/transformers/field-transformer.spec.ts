import { FieldTransformer } from './field-transformer';

describe('FieldTransformer', () => {
  describe('traverseAndTransform', () => {
    const doubleTransformer = (value: number | null) =>
      value === null ? null : value * 2;

    it('should transform simple fields', () => {
      const obj = { a: 1, b: 2 };
      const fields = [{ name: 'a' }];

      const result = FieldTransformer.traverseAndTransform(
        obj,
        fields,
        doubleTransformer,
      );

      expect(result).toEqual({ a: 2, b: 2 });
    });

    it('should transform nested fields', () => {
      const obj = {
        metadata: {
          value: 5,
        },
        other: 1,
      };
      const fields = [
        {
          name: 'metadata',
          fields: [{ name: 'value' }],
        },
      ];

      const result = FieldTransformer.traverseAndTransform(
        obj,
        fields,
        doubleTransformer,
      );

      expect(result).toEqual({
        metadata: {
          value: 10,
        },
        other: 1,
      });
    });

    it('should transform arrays', () => {
      const obj = {
        items: [{ value: 1 }, { value: 2 }],
      };
      const fields = [
        {
          name: 'items',
          fields: [{ name: 'value' }],
        },
      ];

      const result = FieldTransformer.traverseAndTransform(
        obj,
        fields,
        doubleTransformer,
      );

      expect(result).toEqual({
        items: [{ value: 2 }, { value: 4 }],
      });
    });

    it('should handle null values', () => {
      const obj = {
        metadata: null,
        value: 1,
      };
      const fields = [{ name: 'metadata' }, { name: 'value' }];

      const result = FieldTransformer.traverseAndTransform(
        obj,
        fields,
        doubleTransformer,
      );

      expect(result).toEqual({
        metadata: null,
        value: 2,
      });
    });

    it('should not modify non-specified fields', () => {
      const obj = {
        keep: 1,
        transform: 2,
      };
      const fields = [{ name: 'transform' }];

      const result = FieldTransformer.traverseAndTransform(
        obj,
        fields,
        doubleTransformer,
      );

      expect(result.keep).toBe(1);
      expect(result.transform).toBe(4);
    });
  });
});
