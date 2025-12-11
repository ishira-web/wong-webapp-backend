import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { AuthService } from '../services/auth.service';
import { ApiResponseUtil } from '../utils/response';
import { emailSchema, passwordSchema } from '../utils/validators';
import logger from '../config/logger';
import env from '../config/env';

// Validation schemas
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export class AuthController {
  // Register new user
  static async register(req: AuthRequest, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);

      const user = await AuthService.register(validatedData);

      logger.info(`New user registered: ${user.email}`);

      return ApiResponseUtil.created(res, user, 'User registered successfully');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtil.validationError(res, error.errors);
      }
      logger.error('Registration error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Login user
  static async login(req: AuthRequest, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const result = await AuthService.login(
        validatedData.email,
        validatedData.password,
        userAgent,
        ipAddress
      );

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        domain: env.COOKIE_DOMAIN,
      });

      logger.info(`User logged in: ${result.user.email}`);

      return ApiResponseUtil.success(
        res,
        {
          user: result.user,
          accessToken: result.accessToken,
        },
        'Login successful'
      );
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtil.validationError(res, error.errors);
      }
      logger.error('Login error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Refresh access token
  static async refresh(req: AuthRequest, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return ApiResponseUtil.unauthorized(res, 'Refresh token not provided');
      }

      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip || req.socket.remoteAddress;

      const tokens = await AuthService.refreshAccessToken(
        refreshToken,
        userAgent,
        ipAddress
      );

      // Set new refresh token as httpOnly cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        domain: env.COOKIE_DOMAIN,
      });

      return ApiResponseUtil.success(
        res,
        {
          accessToken: tokens.accessToken,
        },
        'Token refreshed successfully'
      );
    } catch (error: any) {
      logger.error('Token refresh error:', error);
      res.clearCookie('refreshToken');
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Logout user
  static async logout(req: AuthRequest, res: Response) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (req.userId) {
        await AuthService.logout(req.userId, refreshToken);
        logger.info(`User logged out: ${req.userId}`);
      }

      // Clear refresh token cookie
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: env.COOKIE_SAME_SITE,
        domain: env.COOKIE_DOMAIN,
      });

      return ApiResponseUtil.success(res, null, 'Logout successful');
    } catch (error: any) {
      logger.error('Logout error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Get current user
  static async me(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res);
      }

      const user = await AuthService.getUserWithPermissions(req.userId);

      return ApiResponseUtil.success(res, user);
    } catch (error: any) {
      logger.error('Get current user error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Change password
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const schema = z.object({
        currentPassword: z.string().min(1, 'Current password is required'),
        newPassword: passwordSchema,
      });

      const { currentPassword, newPassword } = schema.parse(req.body);

      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res);
      }

      // Get user
      const user = await AuthService.getUserWithPermissions(req.userId);

      // Verify current password
      const isValid = await AuthService.verifyPassword(
        (user as any).password,
        currentPassword
      );

      if (!isValid) {
        return ApiResponseUtil.error(res, 'Current password is incorrect', null, 400);
      }

      // Hash new password
      const hashedPassword = await AuthService.hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: req.userId },
        data: {
          password: hashedPassword,
          passwordChangedAt: new Date(),
        },
      });

      // Revoke all refresh tokens
      await AuthService.logout(req.userId);

      logger.info(`Password changed for user: ${req.userId}`);

      return ApiResponseUtil.success(res, null, 'Password changed successfully');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtil.validationError(res, error.errors);
      }
      logger.error('Change password error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }
}

// Need to import prisma
import prisma from '../config/database';
