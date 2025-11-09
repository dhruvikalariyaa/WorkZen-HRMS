import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send employee credentials email
export const sendEmployeeCredentials = async (employeeEmail, loginId, password, employeeName) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email configuration not set. Skipping email send.');
      return { success: false, error: 'Email configuration not set' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"WorkZen HRMS" <${process.env.SMTP_USER}>`,
      to: employeeEmail,
      subject: 'Your WorkZen HRMS Login Credentials',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
            .credentials { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #7c3aed; }
            .credential { margin: 10px 0; }
            .label { font-weight: bold; color: #7c3aed; }
            .value { font-family: monospace; font-size: 16px; color: #1f2937; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WorkZen HRMS</h1>
            </div>
            <div class="content">
              <p>Dear ${employeeName},</p>
              
              <p>Your account has been created in WorkZen HRMS. Please find your login credentials below:</p>
              
              <div class="credentials">
                <div class="credential">
                  <span class="label">Login ID:</span>
                  <div class="value">${loginId}</div>
                </div>
                <div class="credential">
                  <span class="label">Password:</span>
                  <div class="value">${password}</div>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <p>For security reasons, you <strong>must change your password</strong> after your first login.</p>
                <p>Please keep your credentials secure and do not share them with anyone.</p>
              </div>
              
              <p>You can now login to the system using your Login ID or Email address.</p>
              
              <p>If you have any questions, please contact your HR department.</p>
              
              <p>Best regards,<br>WorkZen HRMS Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to WorkZen HRMS
        
        Dear ${employeeName},
        
        Your account has been created. Please find your login credentials below:
        
        Login ID: ${loginId}
        Password: ${password}
        
        IMPORTANT: You must change your password after your first login for security reasons.
        
        You can now login to the system using your Login ID or Email address.
        
        If you have any questions, please contact your HR department.
        
        Best regards,
        WorkZen HRMS Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (userEmail, loginId, newPassword, userName) => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email configuration not set. Skipping email send.');
      return { success: false, error: 'Email configuration not set' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"WorkZen HRMS" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject: 'Password Reset - WorkZen HRMS',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
            .credentials { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #7c3aed; }
            .credential { margin: 10px 0; }
            .label { font-weight: bold; color: #7c3aed; }
            .value { font-family: monospace; font-size: 16px; color: #1f2937; }
            .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Dear ${userName || 'User'},</p>
              
              <p>You have requested to reset your password for your WorkZen HRMS account. A new password has been generated for you:</p>
              
              <div class="credentials">
                <div class="credential">
                  <span class="label">Login ID:</span>
                  <div class="value">${loginId}</div>
                </div>
                <div class="credential">
                  <span class="label">New Password:</span>
                  <div class="value">${newPassword}</div>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <p>For security reasons, you <strong>must change your password</strong> after logging in with this temporary password.</p>
                <p>Please keep your credentials secure and do not share them with anyone.</p>
              </div>
              
              <p>You can now login to the system using your Login ID or Email address with the new password provided above.</p>
              
              <p>If you did not request this password reset, please contact your HR department immediately.</p>
              
              <p>Best regards,<br>WorkZen HRMS Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - WorkZen HRMS
        
        Dear ${userName || 'User'},
        
        You have requested to reset your password for your WorkZen HRMS account. A new password has been generated for you:
        
        Login ID: ${loginId}
        New Password: ${newPassword}
        
        IMPORTANT: You must change your password after logging in with this temporary password for security reasons.
        
        You can now login to the system using your Login ID or Email address with the new password provided above.
        
        If you did not request this password reset, please contact your HR department immediately.
        
        Best regards,
        WorkZen HRMS Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

// Test email configuration
export const testEmailConfig = async () => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return { success: false, error: 'Email configuration not set' };
    }

    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

