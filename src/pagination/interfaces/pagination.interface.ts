export interface PaginationRequest {
  page: number;
  perPage: number;
}

export interface PaginationParams {
  perPage: number;
  offset: number;
}

export interface PaginationMeta {
  total: number;
  pages: number;
  page: number;
  perPage: number;
}

export interface LegacyPaginationMeta {
  totalItems: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface LegacyPaginatedResponse<T> {
  data: T[];
  pagination: LegacyPaginationMeta;
}

export type CountableResponse<T> = [T[], number];
