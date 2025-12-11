import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../config/logger';
import env from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = (err as any).errors || null;

    // Log operational errors as warnings
    if (err.isOperational) {
      logger.warn({
        message: err.message,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
      });
    } else {
      // Log non-operational errors as errors
      logger.error({
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
        path: req.path,
        method: req.method,
      });
    }
  } else {
    // Unknown errors
    logger.error({
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Don't leak error details in production
  const response: any = {
    success: false,
    message: env.NODE_ENV === 'production' && statusCode === 500 ? message : err.message,
  };

  if (errors) {
    response.errors = errors;
  }

  if (env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};
