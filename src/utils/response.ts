import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

export class ApiResponseUtil {
  static success<T>(res: Response, data: T, message?: string, statusCode = 200) {
    const response: ApiResponse<T> = {
      success: true,
      message,
      data,
    };
    return res.status(statusCode).json(response);
  }

  static error(res: Response, message: string, errors?: any, statusCode = 400) {
    const response: ApiResponse = {
      success: false,
      message,
      errors,
    };
    return res.status(statusCode).json(response);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string
  ) {
    const totalPages = Math.ceil(total / limit);
    const response: ApiResponse<PaginatedResponse<T>> = {
      success: true,
      message,
      data: {
        data,
        meta: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
    };
    return res.status(200).json(response);
  }

  static created<T>(res: Response, data: T, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }

  static unauthorized(res: Response, message = 'Unauthorized') {
    return this.error(res, message, null, 401);
  }

  static forbidden(res: Response, message = 'Forbidden') {
    return this.error(res, message, null, 403);
  }

  static notFound(res: Response, message = 'Resource not found') {
    return this.error(res, message, null, 404);
  }

  static validationError(res: Response, errors: any) {
    return this.error(res, 'Validation failed', errors, 422);
  }

  static serverError(res: Response, message = 'Internal server error') {
    return this.error(res, message, null, 500);
  }
}
