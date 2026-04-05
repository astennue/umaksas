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
      rejectUnauthorized: false,
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

/**
 * Send application submission confirmation email with PDF attachment
 */
export async function sendApplicationEmail(
  to: string,
  applicantName: string,
  referenceCode: string,
  pdfBuffer?: Buffer
) {
  const transporter = createTransporter();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.BASE_URL || "http://localhost:3000";

  const attachments: Array<{ filename: string; content: Buffer }> = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `application-${referenceCode}.pdf`,
      content: pdfBuffer,
    });
  }

  const mailOptions = {
    from: getFromAddress(),
    to,
    subject: "UMak SAS - Application Received",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a87); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Application Received!</h1>
          <p style="color: #a8c8e8; margin-top: 8px;">University of Makati Student Assistant Society</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px; color: #333;">Dear <strong>${applicantName}</strong>,</p>
          <p style="font-size: 16px; color: #333;">
            Thank you for applying to the Student Assistant Program at the University of Makati.
          </p>
          <p style="font-size: 16px; color: #333;">
            ${pdfBuffer ? "Attached is the generated application form (PDF) for your reference." : "Your application form has been recorded in our system."}
          </p>
          <div style="background: #e8f4f8; border: 1px solid #b8d8e8; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="font-size: 14px; color: #1e3a5f; margin: 0 0 5px;"><strong>Your Reference Number:</strong></p>
            <p style="font-size: 20px; color: #1e3a5f; margin: 0; font-family: monospace; letter-spacing: 1px;"><strong>${referenceCode}</strong></p>
          </div>
          <p style="font-size: 16px; color: #333;">
            You can track your application status anytime using the link below:
          </p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${baseUrl}/track?ref=${referenceCode}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Track Your Application
            </a>
          </p>
          <p style="font-size: 14px; color: #666;">
            Or copy this link to your browser:<br>
            <span style="color: #1e3a5f;">${baseUrl}/track?ref=${referenceCode}</span>
          </p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            Keep this reference number safe. You can check your application status anytime.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>UMAK Student Assistant Society</strong>
          </p>
        </div>
      </div>
    `,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Application email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send application email to ${to}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Send application status update email
 */
export async function sendApplicationStatusEmail(
  to: string,
  applicantName: string,
  referenceCode: string,
  status: "APPROVED" | "REJECTED",
  reviewNotes?: string,
  pdfBuffer?: Buffer
) {
  const transporter = createTransporter();
  const baseUrl = process.env.NEXTAUTH_URL || process.env.BASE_URL || "http://localhost:3000";

  const attachments: Array<{ filename: string; content: Buffer }> = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `application-${referenceCode}.pdf`,
      content: pdfBuffer,
    });
  }

  const isApproved = status === "APPROVED";
  const statusColor = isApproved ? "#16a34a" : "#dc2626";
  const statusBg = isApproved ? "#f0fdf4" : "#fef2f2";
  const statusLabel = isApproved ? "APPROVED" : "REJECTED";

  const mailOptions = {
    from: getFromAddress(),
    to,
    subject: `UMak SAS - Application ${statusLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f, #2d5a87); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Application Update</h1>
          <p style="color: #a8c8e8; margin-top: 8px;">University of Makati Student Assistant Society</p>
        </div>
        <div style="padding: 30px; background: #f9f9f9; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px; color: #333;">Dear <strong>${applicantName}</strong>,</p>
          <p style="font-size: 16px; color: #333;">
            We have reviewed your application to the Student Assistant Program. Here is your application status:
          </p>
          <div style="background: ${statusBg}; border: 1px solid ${statusColor}33; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #666; margin: 0 0 5px;">Application Status</p>
            <p style="font-size: 24px; color: ${statusColor}; margin: 0; font-weight: bold;">${statusLabel}</p>
          </div>
          ${reviewNotes ? `
          <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="font-size: 14px; color: #92400e; margin: 0 0 5px;"><strong>Review Notes:</strong></p>
            <p style="font-size: 14px; color: #92400e; margin: 0;">${reviewNotes}</p>
          </div>
          ` : ""}
          <div style="background: #e8f4f8; border: 1px solid #b8d8e8; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="font-size: 14px; color: #1e3a5f; margin: 0 0 5px;"><strong>Reference Number:</strong></p>
            <p style="font-size: 20px; color: #1e3a5f; margin: 0; font-family: monospace; letter-spacing: 1px;"><strong>${referenceCode}</strong></p>
          </div>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${baseUrl}/track?ref=${referenceCode}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
              Track Your Application
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <p style="font-size: 14px; color: #666;">
            ${isApproved
              ? "Congratulations! Please wait for further instructions regarding your onboarding."
              : "You may re-apply in the next application period. We encourage you to improve your qualifications."
            }
          </p>
          <p style="font-size: 14px; color: #666;">
            Best regards,<br>
            <strong>UMAK Student Assistant Society</strong>
          </p>
        </div>
      </div>
    `,
    attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Status email (${status}) sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Failed to send status email to ${to}:`, error);
    return { success: false, error: String(error) };
  }
}
