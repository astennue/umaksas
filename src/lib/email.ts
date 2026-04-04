import nodemailer from "nodemailer";

// Create reusable transporter using Gmail SMTP
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: false, // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      ciphers: "SSLv3",
    },
  });
}

// Get "from" email address
function getFromAddress(): string {
  return process.env.EMAIL_FROM || process.env.SMTP_USER || "";
}

/**
 * Send a welcome email to a new Student Assistant
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const transporter = createTransporter();

  const mailOptions = {
    from: getFromAddress(),
    to,
    subject: "Welcome to UMAK Student Assistant Society!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a87); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Welcome to UMAK SAS!</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px; color: #333;">Dear <strong>${name}</strong>,</p>
          <p style="font-size: 16px; color: #333;">
            Welcome to the <strong>University of Makati Student Assistant Society</strong>! 
            We are thrilled to have you join our team of dedicated student assistants.
          </p>
          <p style="font-size: 16px; color: #333;">
            As a student assistant, you will have the opportunity to gain valuable work experience, 
            develop professional skills, and contribute to the UMAK community.
          </p>
          <p style="font-size: 16px; color: #333;">
            Please make sure to complete your profile and check your schedule regularly through the SAS portal.
          </p>
          <p style="font-size: 16px; color: #333;">
            If you have any questions or need assistance, don't hesitate to reach out to us.
          </p>
          <p style="font-size: 16px; color: #333;">
            Best regards,<br>
            <strong>UMAK Student Assistant Society</strong><br>
            umak.studentassistantsociety@gmail.com
          </p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send welcome email to ${to}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send a notification email
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  message: string
) {
  const transporter = createTransporter();

  const mailOptions = {
    from: getFromAddress(),
    to,
    subject: `[UMAK SAS] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a87); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="color: white; margin: 0;">UMAK Student Assistant Society</h2>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <h3 style="color: #1e3a5f;">${subject}</h3>
          <p style="font-size: 16px; color: #333; white-space: pre-line;">${message}</p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 14px; color: #666;">
            This is an automated notification from the UMAK SAS Management System.<br>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notification email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send notification email to ${to}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send a test email to verify SMTP configuration
 */
export async function sendTestEmail() {
  const to = process.env.SMTP_USER || "";
  return sendNotificationEmail(
    to,
    "SMTP Test - Connection Verified",
    "This is a test email from the UMAK SAS Management System.\n\nIf you received this email, the SMTP configuration is working correctly.\n\nTimestamp: " + new Date().toISOString()
  );
}
