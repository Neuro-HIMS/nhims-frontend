// ── Standard API response wrapper from Java backend
// All endpoints return this shape.
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message: string | null;
    timestamp: string;
  }
  
  // ── Paginated list response
  export interface PagedResponse<T> {
    content: T[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    last: boolean;
  }
  
  // ── API error (Spring Boot standard error body)
  export interface ApiError {
    status: number;
    error: string;
    message: string;
    path: string;
    timestamp: string;
    // Validation errors (from @Valid BindingResult)
    fieldErrors?: FieldError[];
  }
  
  export interface FieldError {
    field: string;
    message: string;
    rejectedValue?: unknown;
  }
  
  // ── Pagination params sent to backend
  export interface PaginationParams {
    page?: number;
    size?: number;
    sort?: string;
    direction?: "ASC" | "DESC";
  }