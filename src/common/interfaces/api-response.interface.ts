export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

export interface ApiMeta {
  timestamp?: string;
  requestId?: string;
  pagination?: PaginationMeta;
  [key: string]: unknown;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
