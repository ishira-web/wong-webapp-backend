import { Response, NextFunction } from 'express';
import { AuthRequest, Resource, Action } from '../types';
import { PermissionService } from '../services/permission.service';
import { ApiResponseUtil } from '../utils/response';
import logger from '../config/logger';

// Check if user has specific permission
export const requirePermission = (resource: Resource, action: Action) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res, 'Authentication required');
      }

      const hasPermission = await PermissionService.hasPermission(
        req.userId,
        resource,
        action
      );

      if (!hasPermission) {
        logger.warn(
          `User ${req.userId} attempted to ${action} ${resource} without permission`
        );
        return ApiResponseUtil.forbidden(
          res,
          `You don't have permission to ${action} ${resource}`
        );
      }

      next();
    } catch (error: any) {
      logger.error('Permission check error:', error);
      return ApiResponseUtil.serverError(res, error.message);
    }
  };
};

// Check if user has any of the specified permissions
export const requireAnyPermission = (permissions: Array<{ resource: Resource; action: Action }>) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res, 'Authentication required');
      }

      for (const perm of permissions) {
        const hasPermission = await PermissionService.hasPermission(
          req.userId,
          perm.resource,
          perm.action
        );
        if (hasPermission) {
          return next();
        }
      }

      logger.warn(
        `User ${req.userId} attempted action without required permissions`
      );
      return ApiResponseUtil.forbidden(
        res,
        "You don't have permission to perform this action"
      );
    } catch (error: any) {
      logger.error('Permission check error:', error);
      return ApiResponseUtil.serverError(res, error.message);
    }
  };
};

// Check if user has specific role
export const requireRole = (roleSlugs: string | string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.user) {
        return ApiResponseUtil.unauthorized(res, 'Authentication required');
      }

      const allowedRoles = Array.isArray(roleSlugs) ? roleSlugs : [roleSlugs];
      const userRole = (req.user as any).role.slug;

      if (!allowedRoles.includes(userRole)) {
        logger.warn(
          `User ${req.userId} with role ${userRole} attempted to access resource requiring roles: ${allowedRoles.join(', ')}`
        );
        return ApiResponseUtil.forbidden(
          res,
          'You don\'t have the required role to access this resource'
        );
      }

      next();
    } catch (error: any) {
      logger.error('Role check error:', error);
      return ApiResponseUtil.serverError(res, error.message);
    }
  };
};

// Check if user owns the resource or has permission
export const requireOwnershipOrPermission = (
  resource: Resource,
  action: Action,
  getOwnerId: (req: AuthRequest) => string | undefined
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<any> => {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res, 'Authentication required');
      }

      const ownerId = getOwnerId(req);

      // Check ownership
      if (ownerId && req.userId === ownerId) {
        return next();
      }

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        req.userId,
        resource,
        action
      );

      if (!hasPermission) {
        logger.warn(
          `User ${req.userId} attempted to ${action} ${resource} without ownership or permission`
        );
        return ApiResponseUtil.forbidden(
          res,
          "You don't have permission to perform this action"
        );
      }

      next();
    } catch (error: any) {
      logger.error('Ownership/permission check error:', error);
      return ApiResponseUtil.serverError(res, error.message);
    }
  };
};
