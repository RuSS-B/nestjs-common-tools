export type DriverError = {
  code?: string | number;
  errno?: number;
  constraint?: string;
  detail?: string;
  table?: string;
  column?: string;
};
