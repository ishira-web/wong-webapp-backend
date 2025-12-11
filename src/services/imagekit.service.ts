import ImageKit from 'imagekit';
import { v4 as uuidv4 } from 'uuid';
import env from '../config/env';
import prisma from '../config/database';
import { ImageKitSignature } from '../types';
import logger from '../config/logger';
import { FileType } from '@prisma/client';

const imagekit = new ImageKit({
  publicKey: env.IMAGEKIT_PUBLIC_KEY,
  privateKey: env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
});

export class ImageKitService {
  // Generate authentication parameters for client-side upload
  static getAuthenticationParameters(): ImageKitSignature {
    const token = uuidv4();
    const expire = Math.floor(Date.now() / 1000) + 3600; // 1 hour

    const authParams = imagekit.getAuthenticationParameters(token, expire);

    return {
      signature: authParams.signature,
      expire: authParams.expire,
      token: authParams.token,
      publicKey: env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT,
    };
  }

  // Validate and store file metadata after upload
  static async completeUpload(
    userId: string,
    fileData: {
      fileId: string;
      name: string;
      url: string;
      thumbnailUrl?: string;
      size: number;
      fileType: string;
      type?: FileType;
      entityType?: string;
      entityId?: string;
    }
  ) {
    try {
      // Verify file exists on ImageKit
      const fileDetails = await imagekit.getFileDetails(fileData.fileId);

      if (!fileDetails) {
        throw new Error('File not found on ImageKit');
      }

      // Store file metadata in database
      const file = await prisma.file.create({
        data: {
          name: fileData.name,
          originalName: fileDetails.name,
          mimeType: fileData.fileType || fileDetails.fileType,
          size: fileData.size || fileDetails.size,
          url: fileData.url || fileDetails.url,
          fileId: fileData.fileId,
          thumbnailUrl: fileData.thumbnailUrl || fileDetails.thumbnail || null,
          uploadedById: userId,
          type: fileData.type || FileType.DOCUMENT,
          entityType: fileData.entityType,
          entityId: fileData.entityId,
        },
      });

      logger.info(`File uploaded and stored: ${file.id} by user ${userId}`);

      return file;
    } catch (error: any) {
      logger.error('ImageKit file verification error:', error);
      throw new Error('Failed to verify file upload');
    }
  }

  // Delete file from ImageKit and database
  static async deleteFile(fileId: string, userId: string) {
    try {
      // Get file from database
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file) {
        throw new Error('File not found');
      }

      // Check if user owns the file or has permission
      if (file.uploadedById !== userId) {
        // TODO: Add permission check here
        throw new Error('Unauthorized to delete this file');
      }

      // Delete from ImageKit
      await imagekit.deleteFile(file.fileId);

      // Delete from database
      await prisma.file.delete({
        where: { id: fileId },
      });

      logger.info(`File deleted: ${fileId} by user ${userId}`);

      return true;
    } catch (error: any) {
      logger.error('File deletion error:', error);
      throw error;
    }
  }

  // Get file details
  static async getFileDetails(fileId: string) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return file;
  }

  // Get user files
  static async getUserFiles(
    userId: string,
    options?: {
      type?: FileType;
      entityType?: string;
      entityId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: any = { uploadedById: userId };

    if (options?.type) {
      where.type = options.type;
    }

    if (options?.entityType) {
      where.entityType = options.entityType;
    }

    if (options?.entityId) {
      where.entityId = options.entityId;
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.file.count({ where }),
    ]);

    return { files, total };
  }

  // Update file metadata
  static async updateFileMetadata(
    fileId: string,
    userId: string,
    data: {
      name?: string;
      type?: FileType;
      entityType?: string;
      entityId?: string;
    }
  ) {
    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.uploadedById !== userId) {
      throw new Error('Unauthorized to update this file');
    }

    const updated = await prisma.file.update({
      where: { id: fileId },
      data,
    });

    logger.info(`File metadata updated: ${fileId}`);

    return updated;
  }
}
