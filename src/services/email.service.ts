import nodemailer from 'nodemailer';
import env from '../config/env';
import logger from '../config/logger';
import { EmailPayload } from '../types';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.BREVO_SMTP_HOST,
      port: env.BREVO_SMTP_PORT,
      secure: false,
      auth: {
        user: env.BREVO_SMTP_USER,
        pass: env.BREVO_SMTP_PASS,
      },
    });

    // Verify connection
    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connected successfully');
    } catch (error) {
      logger.error('Email service connection failed:', error);
    }
  }

  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      const mailOptions = {
        from: payload.from || `${env.FROM_NAME} <${env.FROM_EMAIL}>`,
        to: Array.isArray(payload.to) ? payload.to.join(', ') : payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return true;
    } catch (error: any) {
      logger.error('Email sending failed:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Email templates
  async sendWelcomeEmail(to: string, firstName: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to HR System</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Welcome to our HR Management System. We're excited to have you on board.</p>
            <p>You can now access your employee portal and manage your profile, leaves, and more.</p>
            <a href="${env.CORS_ORIGIN}/login" class="button">Login to Dashboard</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>HR Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Welcome to HR System',
      html,
    });
  }

  async sendPasswordResetEmail(to: string, resetToken: string) {
    const resetUrl = `${env.CORS_ORIGIN}/reset-password?token=${resetToken}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #FEF3C7; padding: 10px; border-left: 4px solid #F59E0B; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>You requested a password reset for your HR System account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <div class="warning">
              <p><strong>Note:</strong> This link will expire in 1 hour.</p>
            </div>
            <p>If you didn't request this, please ignore this email.</p>
            <p>Best regards,<br>HR Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'Password Reset Request',
      html,
    });
  }

  async sendLeaveRequestNotification(
    to: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .details { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Leave Request</h1>
          </div>
          <div class="content">
            <p>A new leave request has been submitted:</p>
            <div class="details">
              <p><strong>Employee:</strong> ${employeeName}</p>
              <p><strong>Leave Type:</strong> ${leaveType}</p>
              <p><strong>Start Date:</strong> ${startDate}</p>
              <p><strong>End Date:</strong> ${endDate}</p>
            </div>
            <p>Please review and approve/reject this request in the system.</p>
            <p>Best regards,<br>HR System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `New Leave Request from ${employeeName}`,
      html,
    });
  }

  async sendLeaveStatusNotification(
    to: string,
    status: string,
    leaveType: string,
    startDate: string,
    endDate: string
  ) {
    const statusColor = status === 'APPROVED' ? '#10B981' : '#EF4444';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .details { background: white; padding: 15px; border-left: 4px solid ${statusColor}; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request ${status}</h1>
          </div>
          <div class="content">
            <p>Your leave request has been <strong>${status.toLowerCase()}</strong>.</p>
            <div class="details">
              <p><strong>Leave Type:</strong> ${leaveType}</p>
              <p><strong>Start Date:</strong> ${startDate}</p>
              <p><strong>End Date:</strong> ${endDate}</p>
            </div>
            <p>Best regards,<br>HR Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `Leave Request ${status}`,
      html,
    });
  }

  async sendPayrollNotification(
    to: string,
    month: string,
    year: number,
    amount: number
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .amount { font-size: 32px; color: #10B981; font-weight: bold; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payroll Processed</h1>
          </div>
          <div class="content">
            <p>Your payroll for ${month} ${year} has been processed.</p>
            <div class="amount">$${amount.toFixed(2)}</div>
            <p>Your payslip is now available in the system.</p>
            <p>Best regards,<br>HR Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: `Payroll for ${month} ${year}`,
      html,
    });
  }
}

export default new EmailService();
