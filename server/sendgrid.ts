import * as brevo from '@getbrevo/brevo';

if (!process.env.BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY environment variable must be set");
}

console.log('✅ Brevo API initialized successfully for InstaPay notifications');

const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    console.log('Attempting to send email to:', params.to);
    console.log('Email subject:', params.subject);
    console.log('Attachments count:', params.attachments?.length || 0);
    
    const sendSmtpEmail = new brevo.SendSmtpEmail();
    sendSmtpEmail.sender = { email: params.from };
    sendSmtpEmail.to = [{ email: params.to }];
    sendSmtpEmail.subject = params.subject;
    sendSmtpEmail.htmlContent = params.html;
    sendSmtpEmail.textContent = params.text;
    
    // Convert attachments to Brevo format
    if (params.attachments && params.attachments.length > 0) {
      sendSmtpEmail.attachment = params.attachments.map(att => ({
        content: att.content,
        name: att.filename
      }));
    }
    
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log('Email sent successfully via Brevo');
    return true;
  } catch (error) {
    console.error('Brevo email error:', error);
    return false;
  }
}
