import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AuthService } from '../services/auth.service';
import { ApiResponseUtil } from '../utils/response';
import logger from '../config/logger';

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponseUtil.unauthorized(res, 'No token provided');
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = AuthService.verifyAccessToken(token);

    // Get user with permissions
    const user = await AuthService.getUserWithPermissions(payload.userId);

    // Attach user to request
    req.user = user as any;
    req.userId = user.id;

    next();
  } catch (error: any) {
    logger.error('Authentication error:', error);
    return ApiResponseUtil.unauthorized(res, error.message || 'Invalid token');
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = AuthService.verifyAccessToken(token);
      const user = await AuthService.getUserWithPermissions(payload.userId);
      req.user = user as any;
      req.userId = user.id;
    }
    next();
  } catch (error) {
    // Continue without user
    next();
  }
};
