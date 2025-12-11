import swaggerJsdoc from 'swagger-jsdoc';
import env from './env';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'HR Management System API',
      version: '1.0.0',
      description: 'Production-grade HR Management System API with TypeScript, Express, and Prisma',
      contact: {
        name: 'API Support',
        email: 'support@hrmanagement.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
      {
        url: 'https://api.hrmanagement.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
            },
            errors: {
              type: 'object',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
            },
            limit: {
              type: 'number',
            },
            total: {
              type: 'number',
            },
            totalPages: {
              type: 'number',
            },
            hasNext: {
              type: 'boolean',
            },
            hasPrevious: {
              type: 'boolean',
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User management' },
      { name: 'Roles', description: 'Role and permission management' },
      { name: 'Departments', description: 'Department management' },
      { name: 'Leaves', description: 'Leave management' },
      { name: 'Payroll', description: 'Payroll management' },
      { name: 'Jobs', description: 'Job posting management' },
      { name: 'Candidates', description: 'Candidate management' },
      { name: 'Applications', description: 'Job application management' },
      { name: 'Notifications', description: 'Notification system' },
      { name: 'Uploads', description: 'File upload management' },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
