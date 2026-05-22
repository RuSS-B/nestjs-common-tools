export type ApiErrorItem = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  statusCode: number;
  error: string;
  message: string;
  code: string;
  errors?: ApiErrorItem[];
};
