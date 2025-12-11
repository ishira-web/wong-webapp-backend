import { Queue, Worker, QueueEvents } from 'bullmq';
import redis from '../config/redis';
import emailService from '../services/email.service';
import logger from '../config/logger';
import { EmailPayload } from '../types';

// Create email queue
export const emailQueue = new Queue('email', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 1000,
    },
  },
});

// Email worker
new Worker(
  'email',
  async (job) => {
    logger.info(`Processing email job: ${job.id}`);

    const { type, data } = job.data;

    try {
      switch (type) {
        case 'welcome':
          await emailService.sendWelcomeEmail(data.to, data.firstName);
          break;

        case 'password-reset':
          await emailService.sendPasswordResetEmail(data.to, data.resetToken);
          break;

        case 'leave-request':
          await emailService.sendLeaveRequestNotification(
            data.to,
            data.employeeName,
            data.leaveType,
            data.startDate,
            data.endDate
          );
          break;

        case 'leave-status':
          await emailService.sendLeaveStatusNotification(
            data.to,
            data.status,
            data.leaveType,
            data.startDate,
            data.endDate
          );
          break;

        case 'payroll':
          await emailService.sendPayrollNotification(
            data.to,
            data.month,
            data.year,
            data.amount
          );
          break;

        case 'custom':
          await emailService.sendEmail(data as EmailPayload);
          break;

        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      logger.info(`Email job completed: ${job.id}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`Email job failed: ${job.id}`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
);

// Queue events
const emailQueueEvents = new QueueEvents('email', { connection: redis });

emailQueueEvents.on('completed', ({ jobId }) => {
  logger.info(`Email job ${jobId} completed`);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Email job ${jobId} failed: ${failedReason}`);
});

// Helper functions to add jobs
export const queueWelcomeEmail = async (to: string, firstName: string) => {
  return emailQueue.add('welcome-email', {
    type: 'welcome',
    data: { to, firstName },
  });
};

export const queuePasswordResetEmail = async (to: string, resetToken: string) => {
  return emailQueue.add('password-reset-email', {
    type: 'password-reset',
    data: { to, resetToken },
  });
};

export const queueLeaveRequestEmail = async (
  to: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string
) => {
  return emailQueue.add('leave-request-email', {
    type: 'leave-request',
    data: { to, employeeName, leaveType, startDate, endDate },
  });
};

export const queueLeaveStatusEmail = async (
  to: string,
  status: string,
  leaveType: string,
  startDate: string,
  endDate: string
) => {
  return emailQueue.add('leave-status-email', {
    type: 'leave-status',
    data: { to, status, leaveType, startDate, endDate },
  });
};

export const queuePayrollEmail = async (
  to: string,
  month: string,
  year: number,
  amount: number
) => {
  return emailQueue.add('payroll-email', {
    type: 'payroll',
    data: { to, month, year, amount },
  });
};

export const queueCustomEmail = async (payload: EmailPayload) => {
  return emailQueue.add('custom-email', {
    type: 'custom',
    data: payload,
  });
};

logger.info('Email queue and worker initialized');
