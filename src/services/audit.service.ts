import prisma from '../config/database';
import logger from '../config/logger';

export class AuditService {
  static async log(data: {
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    changes?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          changes: data.changes || null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });

      logger.info(`Audit log created: ${data.action} on ${data.entityType}:${data.entityId}`);

      return auditLog;
    } catch (error) {
      logger.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break the main flow
      return undefined;
    }
  }

  static async getEntityHistory(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  static async getUserActivity(userId: string, limit = 50) {
    return prisma.auditLog.findMany({
      where: {
        userId,
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
