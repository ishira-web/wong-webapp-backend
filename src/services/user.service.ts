import prisma from '../config/database';
import { AuthService } from './auth.service';
import { NotFoundError, ConflictError } from '../utils/errors';
import { getPaginationParams, getSkipTake } from '../utils/pagination';
import { AuditService } from './audit.service';

export class UserService {
  static async getAllUsers(query: any, _currentUserId: string) {
    const { page, limit, sortBy, sortOrder } = getPaginationParams(query);
    const { skip, take } = getSkipTake(page, limit);

    const where: any = {};

    if (query.search) {
      where.OR = [
        { email: { contains: query.search } },
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { employeeId: { contains: query.search } },
      ];
    }

    if (query.roleId) {
      where.roleId = query.roleId;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          avatar: true,
          isActive: true,
          employeeId: true,
          joiningDate: true,
          role: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  static async getUserById(userId: string) {
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

  static async createUser(data: any, createdById: string, ipAddress?: string) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    if (data.employeeId) {
      const existingEmployee = await prisma.user.findUnique({
        where: { employeeId: data.employeeId },
      });

      if (existingEmployee) {
        throw new ConflictError('Employee ID already exists');
      }
    }

    const hashedPassword = await AuthService.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      include: {
        role: true,
        department: true,
      },
    });

    await AuditService.log({
      userId: createdById,
      action: 'CREATE',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async updateUser(userId: string, data: any, updatedById: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new ConflictError('Email already in use');
      }
    }

    if (data.password) {
      data.password = await AuthService.hashPassword(data.password);
      data.passwordChangedAt = new Date();
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: {
        role: true,
        department: true,
      },
    });

    await AuditService.log({
      userId: updatedById,
      action: 'UPDATE',
      entityType: 'user',
      entityId: userId,
      changes: data,
      ipAddress,
    });

    const { password, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  static async deleteUser(userId: string, deletedById: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.delete({ where: { id: userId } });

    await AuditService.log({
      userId: deletedById,
      action: 'DELETE',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    });
  }
}
