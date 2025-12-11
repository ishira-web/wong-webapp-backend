import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import prisma from '../config/database';
import env from '../config/env';
import logger from '../config/logger';
import { JWTPayload, TokenPair } from '../types';
import { UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors';

export class AuthService {
  // Generate JWT access token
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  // Generate JWT refresh token
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
    } as jwt.SignOptions);
  }

  // Verify access token
  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as JWTPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  // Verify password
  static async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      logger.error('Password verification error:', error);
      return false;
    }
  }

  // Generate token pair
  static async generateTokenPair(
    userId: string,
    email: string,
    roleId: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<TokenPair> {
    const payload: JWTPayload = { userId, email, roleId };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Calculate expiration time
    const expiresAt = new Date();
    const expiryDays = parseInt(env.REFRESH_TOKEN_EXPIRES_IN.replace('d', ''), 10);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Hash refresh token before storing
    const hashedRefreshToken = await this.hashPassword(refreshToken);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return { accessToken, refreshToken };
  }

  // Register new user
  static async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password);

    // Get default role (Employee)
    const defaultRole = await prisma.role.findUnique({
      where: { slug: 'employee' },
    });

    if (!defaultRole) {
      throw new Error('Default role not found. Please run database seeds.');
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        roleId: defaultRole.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return user;
  }

  // Login user
  static async login(
    email: string,
    password: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      user.roleId,
      userAgent,
      ipAddress
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  // Refresh access token
  static async refreshAccessToken(
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    // Verify refresh token
    const payload = this.verifyRefreshToken(refreshToken);

    // Find all refresh tokens for user
    const storedTokens = await prisma.refreshToken.findMany({
      where: {
        userId: payload.userId,
        isRevoked: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Check if refresh token exists and is valid
    let isValidToken = false;
    for (const storedToken of storedTokens) {
      if (await this.verifyPassword(storedToken.token, refreshToken)) {
        isValidToken = true;
        break;
      }
    }

    if (!isValidToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Generate new token pair
    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      user.roleId,
      userAgent,
      ipAddress
    );

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return tokens;
  }

  // Logout user
  static async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific refresh token
      const storedTokens = await prisma.refreshToken.findMany({
        where: {
          userId,
          isRevoked: false,
        },
      });

      for (const storedToken of storedTokens) {
        if (await this.verifyPassword(storedToken.token, refreshToken)) {
          await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: {
              isRevoked: true,
              revokedAt: new Date(),
            },
          });
          break;
        }
      }
    } else {
      // Revoke all refresh tokens for user
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
    }
  }

  // Clean up expired tokens
  static async cleanupExpiredTokens() {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired refresh tokens`);
    return result.count;
  }

  // Get user by ID with permissions
  static async getUserWithPermissions(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        department: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
