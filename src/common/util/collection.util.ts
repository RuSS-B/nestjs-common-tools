export const collectionToMap = <T>(
  data: T[],
  key: keyof T,
  value: keyof T,
): Map<string, T[keyof T]> => {
  const map = new Map<string, T[keyof T]>();
  data.forEach((item) => map.set(String(item[key]), item[value]));

  return map;
};
