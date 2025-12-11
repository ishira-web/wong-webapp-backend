import http from 'http';
import app from './app';
import env from './config/env';
import logger from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import notificationService from './services/notification.service';

// Import queues to initialize workers
import './queues/email.queue';

const server = http.createServer(app);

// Initialize WebSocket/SSE for notifications
notificationService.initializeWebSocket(server);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} signal received: closing HTTP server`);

  server.close(async () => {
    logger.info('HTTP server closed');

    // Close database connection
    await disconnectDatabase();

    // Close Redis connection
    await disconnectRedis();

    logger.info('All connections closed. Exiting process.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('=========== UNCAUGHT EXCEPTION ===========');
  console.error('Message:', error.message);
  console.error('Stack:', error.stack);
  console.error('==========================================');
  logger.error('Uncaught Exception:', error);
  // Application specific logging, throwing an error, or other logic here
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Connect to Redis
    await connectRedis();

    // Start HTTP server
    server.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${env.PORT}`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`API Documentation: http://localhost:${env.PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
