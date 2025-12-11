import prisma from '../config/database';
import { LeaveType, LeaveStatus } from '@prisma/client';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { getPaginationParams, getSkipTake } from '../utils/pagination';
import { AuditService } from './audit.service';
import notificationService from './notification.service';
import { queueLeaveRequestEmail, queueLeaveStatusEmail } from '../queues/email.queue';

export class LeaveService {
  static async createLeaveRequest(
    userId: string,
    data: {
      type: LeaveType;
      startDate: Date;
      endDate: Date;
      reason: string;
    }
  ) {
    const days = this.calculateLeaveDays(data.startDate, data.endDate);

    const leave = await prisma.leave.create({
      data: {
        userId,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        days,
        reason: data.reason,
        status: LeaveStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            department: {
              select: {
                manager: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Send notification to manager
    if (leave.user.department?.manager?.email) {
      await queueLeaveRequestEmail(
        leave.user.department.manager.email,
        `${leave.user.firstName} ${leave.user.lastName}`,
        data.type,
        data.startDate.toISOString(),
        data.endDate.toISOString()
      );
    }

    await AuditService.log({
      userId,
      action: 'CREATE',
      entityType: 'leave',
      entityId: leave.id,
    });

    return leave;
  }

  static async getLeaves(query: any, userId: string, isManager: boolean) {
    const { page, limit, sortBy, sortOrder } = getPaginationParams(query);
    const { skip, take } = getSkipTake(page, limit);

    const where: any = {};

    // Regular users can only see their own leaves
    if (!isManager) {
      where.userId = userId;
    } else if (query.userId) {
      where.userId = query.userId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.AND = [];
      if (query.startDate) {
        where.AND.push({ startDate: { gte: new Date(query.startDate) } });
      }
      if (query.endDate) {
        where.AND.push({ endDate: { lte: new Date(query.endDate) } });
      }
    }

    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true,
            },
          },
        },
      }),
      prisma.leave.count({ where }),
    ]);

    return { leaves, total, page, limit };
  }

  static async approveLeave(leaveId: string, approverId: string) {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        user: true,
      },
    });

    if (!leave) {
      throw new NotFoundError('Leave request not found');
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new ForbiddenError('Leave request has already been processed');
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: {
        user: true,
      },
    });

    // Send notification
    await notificationService.createNotification(
      leave.userId,
      'LEAVE_APPROVED',
      'Leave Request Approved',
      `Your ${leave.type} leave request has been approved`
    );

    await queueLeaveStatusEmail(
      leave.user.email,
      'APPROVED',
      leave.type,
      leave.startDate.toISOString(),
      leave.endDate.toISOString()
    );

    await AuditService.log({
      userId: approverId,
      action: 'APPROVE',
      entityType: 'leave',
      entityId: leaveId,
    });

    return updated;
  }

  static async rejectLeave(leaveId: string, rejecterId: string, reason: string) {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: {
        user: true,
      },
    });

    if (!leave) {
      throw new NotFoundError('Leave request not found');
    }

    if (leave.status !== LeaveStatus.PENDING) {
      throw new ForbiddenError('Leave request has already been processed');
    }

    const updated = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: LeaveStatus.REJECTED,
        rejectedBy: rejecterId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
      include: {
        user: true,
      },
    });

    await notificationService.createNotification(
      leave.userId,
      'LEAVE_REJECTED',
      'Leave Request Rejected',
      `Your ${leave.type} leave request has been rejected`
    );

    await queueLeaveStatusEmail(
      leave.user.email,
      'REJECTED',
      leave.type,
      leave.startDate.toISOString(),
      leave.endDate.toISOString()
    );

    await AuditService.log({
      userId: rejecterId,
      action: 'REJECT',
      entityType: 'leave',
      entityId: leaveId,
    });

    return updated;
  }

  private static calculateLeaveDays(startDate: Date, endDate: Date): number {
    const diff = endDate.getTime() - startDate.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    return days;
  }
}
