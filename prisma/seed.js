"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2_1 = __importDefault(require("argon2"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Create permissions
    console.log('Creating permissions...');
    const resources = ['user', 'role', 'permission', 'department', 'leave', 'payroll', 'job', 'candidate', 'application', 'notification', 'file', 'audit_log', 'setting'];
    const actions = ['create', 'read', 'update', 'delete', 'approve', 'reject', 'manage'];
    const permissions = [];
    for (const resource of resources) {
        for (const action of actions) {
            // Not all actions apply to all resources
            if ((action === 'approve' || action === 'reject') && !['leave', 'application'].includes(resource)) {
                continue;
            }
            const permission = await prisma.permission.upsert({
                where: { slug: `${resource}:${action}` },
                update: {},
                create: {
                    name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
                    slug: `${resource}:${action}`,
                    resource,
                    action,
                    description: `Permission to ${action} ${resource}`,
                },
            });
            permissions.push(permission);
        }
    }
    console.log(`✅ Created ${permissions.length} permissions`);
    // Create roles
    console.log('Creating roles...');
    // Super Admin - has all permissions
    const superAdminRole = await prisma.role.upsert({
        where: { slug: 'super-admin' },
        update: {},
        create: {
            name: 'Super Admin',
            slug: 'super-admin',
            description: 'Full system access',
            isSystem: true,
        },
    });
    // Assign all permissions to super admin
    for (const permission of permissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: superAdminRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: superAdminRole.id,
                permissionId: permission.id,
            },
        });
    }
    // HR Manager
    const hrManagerRole = await prisma.role.upsert({
        where: { slug: 'hr-manager' },
        update: {},
        create: {
            name: 'HR Manager',
            slug: 'hr-manager',
            description: 'HR management access',
            isSystem: true,
        },
    });
    const hrManagerPermissions = permissions.filter((p) => ['user', 'department', 'leave', 'payroll', 'job', 'candidate', 'application'].includes(p.resource));
    for (const permission of hrManagerPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: hrManagerRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: hrManagerRole.id,
                permissionId: permission.id,
            },
        });
    }
    // Manager
    const managerRole = await prisma.role.upsert({
        where: { slug: 'manager' },
        update: {},
        create: {
            name: 'Manager',
            slug: 'manager',
            description: 'Department manager access',
            isSystem: true,
        },
    });
    const managerPermissions = permissions.filter((p) => (p.resource === 'user' && p.action === 'read') ||
        (p.resource === 'leave' && ['read', 'approve', 'reject'].includes(p.action)) ||
        (p.resource === 'department' && p.action === 'read'));
    for (const permission of managerPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: managerRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: managerRole.id,
                permissionId: permission.id,
            },
        });
    }
    // Employee
    const employeeRole = await prisma.role.upsert({
        where: { slug: 'employee' },
        update: {},
        create: {
            name: 'Employee',
            slug: 'employee',
            description: 'Basic employee access',
            isSystem: true,
        },
    });
    const employeePermissions = permissions.filter((p) => (p.resource === 'leave' && p.action === 'create') ||
        (p.resource === 'notification' && p.action === 'read') ||
        (p.resource === 'file' && ['create', 'read'].includes(p.action)));
    for (const permission of employeePermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: employeeRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: employeeRole.id,
                permissionId: permission.id,
            },
        });
    }
    console.log('✅ Created roles: Super Admin, HR Manager, Manager, Employee');
    // Create departments
    console.log('Creating departments...');
    const itDepartment = await prisma.department.upsert({
        where: { code: 'IT' },
        update: {},
        create: {
            name: 'Information Technology',
            code: 'IT',
            description: 'IT and software development',
        },
    });
    const hrDepartment = await prisma.department.upsert({
        where: { code: 'HR' },
        update: {},
        create: {
            name: 'Human Resources',
            code: 'HR',
            description: 'Human resources and recruitment',
        },
    });
    const financeDepartment = await prisma.department.upsert({
        where: { code: 'FIN' },
        update: {},
        create: {
            name: 'Finance',
            code: 'FIN',
            description: 'Finance and accounting',
        },
    });
    console.log('✅ Created departments');
    // Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await argon2_1.default.hash('Admin@123');
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@hrmanagement.com' },
        update: {},
        create: {
            email: 'admin@hrmanagement.com',
            password: hashedPassword,
            firstName: 'Super',
            lastName: 'Admin',
            phone: '+1234567890',
            isActive: true,
            isEmailVerified: true,
            employeeId: 'EMP001',
            roleId: superAdminRole.id,
            departmentId: itDepartment.id,
            joiningDate: new Date(),
        },
    });
    console.log('✅ Created admin user');
    console.log('📧 Email: admin@hrmanagement.com');
    console.log('🔑 Password: Admin@123');
    // Create HR Manager user
    const hrManagerUser = await prisma.user.upsert({
        where: { email: 'hr@hrmanagement.com' },
        update: {},
        create: {
            email: 'hr@hrmanagement.com',
            password: hashedPassword,
            firstName: 'HR',
            lastName: 'Manager',
            phone: '+1234567891',
            isActive: true,
            isEmailVerified: true,
            employeeId: 'EMP002',
            roleId: hrManagerRole.id,
            departmentId: hrDepartment.id,
            joiningDate: new Date(),
        },
    });
    console.log('✅ Created HR manager user');
    console.log('📧 Email: hr@hrmanagement.com');
    console.log('🔑 Password: Admin@123');
    // Create sample employee
    const employeeUser = await prisma.user.upsert({
        where: { email: 'employee@hrmanagement.com' },
        update: {},
        create: {
            email: 'employee@hrmanagement.com',
            password: hashedPassword,
            firstName: 'John',
            lastName: 'Doe',
            phone: '+1234567892',
            isActive: true,
            isEmailVerified: true,
            employeeId: 'EMP003',
            roleId: employeeRole.id,
            departmentId: itDepartment.id,
            joiningDate: new Date(),
        },
    });
    console.log('✅ Created employee user');
    console.log('📧 Email: employee@hrmanagement.com');
    console.log('🔑 Password: Admin@123');
    // Create system settings
    console.log('Creating system settings...');
    await prisma.setting.upsert({
        where: { key: 'company_name' },
        update: {},
        create: {
            key: 'company_name',
            value: 'HR Management Inc.',
            type: 'STRING',
            category: 'general',
            isPublic: true,
        },
    });
    await prisma.setting.upsert({
        where: { key: 'annual_leave_days' },
        update: {},
        create: {
            key: 'annual_leave_days',
            value: '20',
            type: 'NUMBER',
            category: 'leave',
            isPublic: false,
        },
    });
    await prisma.setting.upsert({
        where: { key: 'sick_leave_days' },
        update: {},
        create: {
            key: 'sick_leave_days',
            value: '10',
            type: 'NUMBER',
            category: 'leave',
            isPublic: false,
        },
    });
    console.log('✅ Created system settings');
    console.log('✨ Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map