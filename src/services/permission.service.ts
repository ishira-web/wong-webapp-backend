import prisma from '../config/database';
import { Resource, Action } from '../types';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class PermissionService {
  // Check if user has specific permission
  static async hasPermission(
    userId: string,
    resource: Resource,
    action: Action
  ): Promise<boolean> {
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
      },
    });

    if (!user) {
      return false;
    }

    // Super admin has all permissions
    if (user.role.slug === 'super-admin') {
      return true;
    }

    // Check if user's role has the required permission
    return user.role.permissions.some(
      (rp) => rp.permission.resource === resource && rp.permission.action === action
    );
  }

  // Get all permissions for a user
  static async getUserPermissions(userId: string) {
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
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user.role.permissions.map((rp) => rp.permission);
  }

  // Get all permissions for a role
  static async getRolePermissions(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundError('Role not found');
    }

    return role.permissions.map((rp) => rp.permission);
  }

  // Assign permission to role
  static async assignPermissionToRole(roleId: string, permissionId: string) {
    // Check if role exists
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    // Check if permission exists
    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    // Check if already assigned
    const existing = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Assign permission
    return prisma.rolePermission.create({
      data: {
        roleId,
        permissionId,
      },
      include: {
        permission: true,
      },
    });
  }

  // Remove permission from role
  static async removePermissionFromRole(roleId: string, permissionId: string) {
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw new NotFoundError('Permission not assigned to this role');
    }

    await prisma.rolePermission.delete({
      where: { id: rolePermission.id },
    });
  }

  // Create new permission
  static async createPermission(data: {
    name: string;
    slug: string;
    resource: string;
    action: string;
    description?: string;
  }) {
    return prisma.permission.create({
      data,
    });
  }

  // Get all permissions
  static async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  // Check if user can access resource (owns or has permission)
  static async canAccessResource(
    userId: string,
    resource: Resource,
    action: Action,
    resourceOwnerId?: string
  ): Promise<boolean> {
    // Check if user owns the resource
    if (resourceOwnerId && userId === resourceOwnerId) {
      return true;
    }

    // Check if user has permission
    return this.hasPermission(userId, resource, action);
  }

  // Require permission (throws error if not authorized)
  static async requirePermission(userId: string, resource: Resource, action: Action) {
    const hasPermission = await this.hasPermission(userId, resource, action);
    if (!hasPermission) {
      throw new ForbiddenError(`You don't have permission to ${action} ${resource}`);
    }
  }
}
