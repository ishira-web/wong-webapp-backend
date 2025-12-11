import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import prisma from '../config/database';
import logger from '../config/logger';
import { NotificationType } from '@prisma/client';
import env from '../config/env';

class NotificationService {
  private io?: SocketIOServer;
  private sseClients: Map<string, any> = new Map();

  initializeWebSocket(server: HTTPServer) {
    if (env.NOTIFICATION_MODE === 'websocket') {
      this.io = new SocketIOServer(server, {
        cors: {
          origin: env.CORS_ORIGIN.split(','),
          credentials: true,
        },
      });

      this.io.on('connection', (socket) => {
        logger.info(`WebSocket client connected: ${socket.id}`);

        socket.on('authenticate', (userId: string) => {
          socket.join(`user:${userId}`);
          logger.info(`User ${userId} authenticated on socket ${socket.id}`);
        });

        socket.on('disconnect', () => {
          logger.info(`WebSocket client disconnected: ${socket.id}`);
        });
      });

      logger.info('WebSocket server initialized');
    }
  }

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: any
  ) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data || null,
      },
    });

    // Broadcast notification
    this.broadcastToUser(userId, 'notification', notification);

    logger.info(`Notification created for user ${userId}: ${type}`);

    return notification;
  }

  async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    }
  ) {
    const where: any = { userId };

    if (options?.unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  broadcastToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
      logger.debug(`WebSocket event sent to user ${userId}: ${event}`);
    }

    // Also send via SSE if client is connected
    const sseClient = this.sseClients.get(userId);
    if (sseClient) {
      sseClient.write(`data: ${JSON.stringify({ event, data })}\n\n`);
      logger.debug(`SSE event sent to user ${userId}: ${event}`);
    }
  }

  registerSSEClient(userId: string, res: any) {
    this.sseClients.set(userId, res);

    res.on('close', () => {
      this.sseClients.delete(userId);
      logger.info(`SSE client disconnected: ${userId}`);
    });

    logger.info(`SSE client registered: ${userId}`);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }
}

export default new NotificationService();
