export interface IPaginationRequestParams {
  page: number;
  perPage: number;
}

export interface IPaginationParams {
  perPage: number;
  offset: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: IPaginationData;
}

export interface IPaginationData {
  totalItems: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export type CountableResponse<T> = [T[], number];
