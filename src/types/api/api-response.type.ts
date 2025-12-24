interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse };
