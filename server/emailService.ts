import * as brevo from '@getbrevo/brevo';

// Initialize Brevo
const API_KEY = process.env.BREVO_API_KEY;

let apiInstance: brevo.TransactionalEmailsApi | null = null;

if (!API_KEY) {
  console.warn('⚠️  BREVO_API_KEY not found. Email functionality will be disabled.');
} else {
  console.log('✅ Brevo API initialized successfully for password reset emails');
  apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, API_KEY);
}

export const emailService = {
  async sendPasswordResetEmail(to: string, resetToken: string): Promise<boolean> {
    if (!API_KEY || !apiInstance) {
      console.log('Brevo not configured, password reset email would be sent to:', to);
      return false;
    }

    try {
      // Determine the base URL for the reset link
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://wagba.food' 
        : 'http://localhost:5000';
      
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.sender = { email: 'aelnaggar35@gmail.com', name: 'Wagba' };
      sendSmtpEmail.to = [{ email: to }];
      sendSmtpEmail.subject = 'Password Reset - Wagba';
      sendSmtpEmail.htmlContent = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; color: #333;">
          <div style="background: linear-gradient(135deg, #FF6B35, #F7931E); padding: 40px 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Wagba</h1>
            <p style="color: white; margin: 10px 0 0; font-size: 16px;">Reset Your Password</p>
          </div>
          
          <div style="padding: 40px 20px; background: white;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              We received a request to reset your password for your Wagba account. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #FF6B35; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 25px;">
              If you didn't request this password reset, you can safely ignore this email. The link will expire in 1 hour.
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #FF6B35; word-break: break-all;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666; margin: 0;">
              Best regards,<br>
              The Wagba Team
            </p>
          </div>
        </div>
      `;
      sendSmtpEmail.textContent = `
Password Reset Request

We received a request to reset your password for your Wagba account.

To reset your password, visit this link: ${resetUrl}

If you didn't request this password reset, you can safely ignore this email. The link will expire in 1 hour.

Best regards,
The Wagba Team
      `.trim();

      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Password reset email sent successfully to:', to);
      console.log('Brevo response:', response);
      return true;
    } catch (error) {
      console.error('❌ Error sending password reset email:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return false;
    }
  },

  async sendWelcomeEmail(params: {
    to: string;
    customerName: string;
    mealCount: number;
    portionSize: string;
    firstDeliveryDate: string;
    orderTotal: number;
  }): Promise<boolean> {
    if (!API_KEY || !apiInstance) {
      console.log('Brevo not configured, welcome email would be sent to:', params.to);
      return false;
    }

    try {
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.sender = { email: 'aelnaggar35@gmail.com', name: 'Wagba' };
      sendSmtpEmail.to = [{ email: params.to, name: params.customerName }];
      sendSmtpEmail.templateId = 1;
      sendSmtpEmail.params = {
        CUSTOMER_NAME: params.customerName,
        MEAL_COUNT: params.mealCount.toString(),
        PORTION_SIZE: params.portionSize,
        FIRST_DELIVERY_DATE: params.firstDeliveryDate,
        ORDER_TOTAL: params.orderTotal.toString()
      };

      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Welcome email sent successfully to:', params.to);
      console.log('Template parameters:', sendSmtpEmail.params);
      console.log('Brevo response:', response);
      return true;
    } catch (error) {
      console.error('❌ Error sending welcome email:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return false;
    }
  }
};
