// types/api.ts
/**
 * API-related type definitions
 */

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface PaginatedResponse<T> {
    success: boolean;
    items: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

export interface RateLimitInfo {
    limit: number;
    remaining: number;
    reset: number;
}