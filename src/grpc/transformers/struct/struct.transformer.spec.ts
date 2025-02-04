import { StructTransformer } from './struct.transformer';

describe('StructTransformer', () => {
  describe('toStruct', () => {
    it('should transform primitive values correctly', () => {
      const input = {
        str: 'string',
        num: 123,
        bool: true,
        nullVal: null,
      };

      const result = StructTransformer.toStruct(input);

      expect(result).toEqual({
        fields: {
          str: { stringValue: 'string' },
          num: { numberValue: 123 },
          bool: { boolValue: true },
          nullVal: { nullValue: 0 },
        },
      });
    });

    it('should transform nested objects correctly', () => {
      const input = {
        nested: {
          str: 'nested string',
          num: 456,
        },
      };

      const result = StructTransformer.toStruct(input);

      expect(result).toEqual({
        fields: {
          nested: {
            structValue: {
              fields: {
                str: { stringValue: 'nested string' },
                num: { numberValue: 456 },
              },
            },
          },
        },
      });
    });

    it('should transform arrays correctly', () => {
      const input = {
        arr: [1, 'string', true],
      };

      const result = StructTransformer.toStruct(input);

      expect(result).toEqual({
        fields: {
          arr: {
            listValue: {
              values: [
                { numberValue: 1 },
                { stringValue: 'string' },
                { boolValue: true },
              ],
            },
          },
        },
      });
    });
  });

  describe('toObject', () => {
    it('should transform struct back to object with primitive values', () => {
      const input = {
        fields: {
          str: { stringValue: 'string' },
          num: { numberValue: 123 },
          bool: { boolValue: true },
          nullVal: { nullValue: 0 as const },
        },
      };

      const result = StructTransformer.toObject(input);

      expect(result).toEqual({
        str: 'string',
        num: 123,
        bool: true,
        nullVal: null,
      });
    });

    it('should transform nested structs back to nested objects', () => {
      const input = {
        fields: {
          nested: {
            structValue: {
              fields: {
                str: { stringValue: 'nested string' },
                num: { numberValue: 456 },
              },
            },
          },
        },
      };

      const result = StructTransformer.toObject(input);

      expect(result).toEqual({
        nested: {
          str: 'nested string',
          num: 456,
        },
      });
    });

    it('should transform list values back to arrays', () => {
      const input = {
        fields: {
          arr: {
            listValue: {
              values: [
                { numberValue: 1 },
                { stringValue: 'string' },
                { boolValue: true },
              ],
            },
          },
        },
      };

      const result = StructTransformer.toObject(input);

      expect(result).toEqual({
        arr: [1, 'string', true],
      });
    });

    it('should transform mixed values', () => {
      const input = {
        fields: {
          strVal: { stringValue: 'ThisIsString' },
          numVal: {
            numberValue: 1342,
          },
          boolVal: {
            boolValue: false,
          },
          nestedVal: {
            structValue: {
              fields: {
                boolVal2: {
                  boolValue: true,
                },
                strVal: {
                  stringValue: 'Hello',
                },
                nestedVal2: {
                  structValue: {
                    fields: {
                      numVal: {
                        numberValue: 15,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const result = StructTransformer.toObject(input);

      expect(result).toEqual({
        strVal: 'ThisIsString',
        numVal: 1342,
        boolVal: false,
        nestedVal: {
          boolVal2: true,
          strVal: 'Hello',
          nestedVal2: {
            numVal: 15,
          },
        },
      });
    });
  });

  describe('roundtrip conversion', () => {
    it('should correctly convert object to struct and back', () => {
      const originalObj = {
        str: 'string',
        num: 123,
        bool: true,
        null: null,
        nested: {
          arr: [1, 2, 3],
          obj: {
            deep: 'value',
          },
        },
      };

      const struct = StructTransformer.toStruct(originalObj);
      const result = StructTransformer.toObject(struct);

      expect(result).toEqual(originalObj);
    });
  });

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const result = StructTransformer.toStruct({});
      expect(result).toEqual({ fields: {} });
    });

    it('should handle undefined inputs in toObject', () => {
      expect(StructTransformer.toObject(undefined)).toBeUndefined();
    });

    it('should handle empty arrays', () => {
      const input = { arr: [] };
      const result = StructTransformer.toStruct(input);
      expect(result).toEqual({
        fields: {
          arr: {
            listValue: {
              values: [],
            },
          },
        },
      });
    });
  });
});
