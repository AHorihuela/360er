import { ApiResponse } from '@shared/types';

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data
  };
}

export function errorResponse(error: string): ApiResponse<never> {
  return {
    success: false,
    error
  };
} 