import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import { ImageKitService } from '../services/imagekit.service';
import { ApiResponseUtil } from '../utils/response';
import logger from '../config/logger';
import { FileType } from '@prisma/client';

const completeUploadSchema = z.object({
  fileId: z.string().min(1, 'File ID is required'),
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL'),
  thumbnailUrl: z.string().url().optional(),
  size: z.number().positive(),
  fileType: z.string(),
  type: z.nativeEnum(FileType).optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export class UploadController {
  // Get signature for client-side upload
  static async getSignature(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res);
      }

      const signature = ImageKitService.getAuthenticationParameters();

      return ApiResponseUtil.success(res, signature, 'Signature generated successfully');
    } catch (error: any) {
      logger.error('Get signature error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Complete upload after client-side upload
  static async completeUpload(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res);
      }

      const validatedData = completeUploadSchema.parse(req.body);

      const file = await ImageKitService.completeUpload(req.userId, validatedData);

      return ApiResponseUtil.created(res, file, 'File uploaded successfully');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtil.validationError(res, error.errors);
      }
      logger.error('Complete upload error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Get file details
  static async getFile(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const file = await ImageKitService.getFileDetails(id);

      if (!file) {
        return ApiResponseUtil.notFound(res, 'File not found');
      }

      return ApiResponseUtil.success(res, file);
    } catch (error: any) {
      logger.error('Get file error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Get user files
  static async getUserFiles(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res);
      }

      const type = req.query.type as FileType | undefined;
      const entityType = req.query.entityType as string | undefined;
      const entityId = req.query.entityId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const result = await ImageKitService.getUserFiles(req.userId, {
        type,
        entityType,
        entityId,
        limit,
        offset,
      });

      return ApiResponseUtil.success(res, result);
    } catch (error: any) {
      logger.error('Get user files error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Delete file
  static async deleteFile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res);
      }

      const { id } = req.params;

      await ImageKitService.deleteFile(id, req.userId);

      return ApiResponseUtil.success(res, null, 'File deleted successfully');
    } catch (error: any) {
      logger.error('Delete file error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }

  // Update file metadata
  static async updateFile(req: AuthRequest, res: Response) {
    try {
      if (!req.userId) {
        return ApiResponseUtil.unauthorized(res);
      }

      const { id } = req.params;
      const schema = z.object({
        name: z.string().optional(),
        type: z.nativeEnum(FileType).optional(),
        entityType: z.string().optional(),
        entityId: z.string().optional(),
      });

      const validatedData = schema.parse(req.body);

      const file = await ImageKitService.updateFileMetadata(id, req.userId, validatedData);

      return ApiResponseUtil.success(res, file, 'File updated successfully');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtil.validationError(res, error.errors);
      }
      logger.error('Update file error:', error);
      return ApiResponseUtil.error(res, error.message, null, error.statusCode || 500);
    }
  }
}
