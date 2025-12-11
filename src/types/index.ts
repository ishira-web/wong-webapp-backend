import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: User;
  userId?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any;
}

export interface JWTPayload {
  userId: string;
  email: string;
  roleId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ImageKitSignature {
  signature: string;
  expire: number;
  token: string;
  publicKey: string;
  urlEndpoint: string;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export enum Resource {
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  DEPARTMENT = 'department',
  LEAVE = 'leave',
  PAYROLL = 'payroll',
  JOB = 'job',
  CANDIDATE = 'candidate',
  APPLICATION = 'application',
  NOTIFICATION = 'notification',
  FILE = 'file',
  AUDIT_LOG = 'audit_log',
  SETTING = 'setting',
}

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  MANAGE = 'manage',
}
