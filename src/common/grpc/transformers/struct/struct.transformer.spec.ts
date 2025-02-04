import { StructTransformer } from './struct.transformer';

describe('StructTransformer', () => {
    describe('fromObjectToStruct', () => {
        it('should transform primitive values correctly', () => {
            const input = {
                str: 'string',
                num: 123,
                bool: true,
                nullVal: null,
            };

            const result = StructTransformer.fromObjectToStruct(input);

            expect(result).toEqual({
                fields: [
                    { key: 'str', value: { stringValue: 'string' } },
                    { key: 'num', value: { numberValue: 123 } },
                    { key: 'bool', value: { boolValue: true } },
                    { key: 'nullVal', value: { nullValue: 0 } },
                ],
            });
        });

        it('should transform nested objects correctly', () => {
            const input = {
                nested: {
                    str: 'nested string',
                    num: 456,
                },
            };

            const result = StructTransformer.fromObjectToStruct(input);

            expect(result).toEqual({
                fields: [
                    {
                        key: 'nested',
                        value: {
                            structValue: {
                                fields: [
                                    { key: 'str', value: { stringValue: 'nested string' } },
                                    { key: 'num', value: { numberValue: 456 } },
                                ],
                            },
                        },
                    },
                ],
            });
        });

        it('should transform arrays correctly', () => {
            const input = {
                arr: [1, 'string', true],
            };

            const result = StructTransformer.fromObjectToStruct(input);

            expect(result).toEqual({
                fields: [
                    {
                        key: 'arr',
                        value: {
                            listValue: {
                                values: [
                                    { numberValue: 1 },
                                    { stringValue: 'string' },
                                    { boolValue: true },
                                ],
                            },
                        },
                    },
                ],
            });
        });
    });

    describe('fromStructToObject', () => {
        it('should transform struct back to object with primitive values', () => {
            const input = {
                fields: [
                    { key: 'str', value: { stringValue: 'string' } },
                    { key: 'num', value: { numberValue: 123 } },
                    { key: 'bool', value: { boolValue: true } },
                    { key: 'nullVal', value: { nullValue: 0 as const } },
                ],
            };

            const result = StructTransformer.fromStructToObject(input);

            expect(result).toEqual({
                str: 'string',
                num: 123,
                bool: true,
                nullVal: null,
            });
        });

        it('should transform nested structs back to nested objects', () => {
            const input = {
                fields: [
                    {
                        key: 'nested',
                        value: {
                            structValue: {
                                fields: [
                                    { key: 'str', value: { stringValue: 'nested string' } },
                                    { key: 'num', value: { numberValue: 456 } },
                                ],
                            },
                        },
                    },
                ],
            };

            const result = StructTransformer.fromStructToObject(input);

            expect(result).toEqual({
                nested: {
                    str: 'nested string',
                    num: 456,
                },
            });
        });

        it('should transform list values back to arrays', () => {
            const input = {
                fields: [
                    {
                        key: 'arr',
                        value: {
                            listValue: {
                                values: [
                                    { numberValue: 1 },
                                    { stringValue: 'string' },
                                    { boolValue: true },
                                ],
                            },
                        },
                    },
                ],
            };

            const result = StructTransformer.fromStructToObject(input);

            expect(result).toEqual({
                arr: [1, 'string', true],
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

            const struct = StructTransformer.fromObjectToStruct(originalObj);
            const result = StructTransformer.fromStructToObject(struct);

            expect(result).toEqual(originalObj);
        });
    });

    describe('edge cases', () => {
        it('should handle empty objects', () => {
            const result = StructTransformer.fromObjectToStruct({});
            expect(result).toEqual({ fields: [] });
        });

        it('should handle undefined inputs in fromStructToObject', () => {
            expect(StructTransformer.fromStructToObject(undefined)).toBeUndefined();
        });

        it('should handle empty arrays', () => {
            const input = { arr: [] };
            const result = StructTransformer.fromObjectToStruct(input);
            expect(result).toEqual({
                fields: [
                    {
                        key: 'arr',
                        value: {
                            listValue: {
                                values: [],
                            },
                        },
                    },
                ],
            });
        });
    });
});
