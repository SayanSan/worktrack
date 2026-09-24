import nodemailer from "nodemailer";

// Provider-agnostic SMTP (Mailjet, Brevo, Gmail, etc.). Set these env vars:
//   SMTP_HOST  e.g. in-v3.mailjet.com
//   SMTP_PORT  587 (STARTTLS) or 465 (SSL); defaults to 587
//   SMTP_USER  the SMTP username (for Mailjet: your API Key)
//   SMTP_PASS  the SMTP password (for Mailjet: your Secret Key)
//   SMTP_FROM  the From address (must be a sender the provider has verified)
// Emails are skipped (not an error) if SMTP_HOST/USER/PASS are unset.
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM ?? SMTP_USER;

const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

export async function sendTaskAssignedEmail(input: {
  to: string;
  cc?: string[];
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  assignedByName: string;
  dueDate: string | null;
  appUrl: string;
}) {
  if (!transporter) {
    console.warn("SMTP_HOST / SMTP_USER / SMTP_PASS not set — skipping task assignment email.");
    return;
  }

  try {
    await transporter.sendMail({
      from: `WorkTrack <${SMTP_FROM}>`,
      to: input.to,
      cc: input.cc?.length ? input.cc : undefined,
      subject: `New task assigned: ${input.taskTitle}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
          <p>Hi ${input.assigneeName},</p>
          <p><strong>${input.assignedByName}</strong> assigned you a task in <strong>${input.projectName}</strong>:</p>
          <table style="width: 100%; background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <tr><td style="font-size: 16px; font-weight: 600; padding-bottom: 8px;">${input.taskTitle}</td></tr>
            ${input.dueDate ? `<tr><td style="color: #64748b; font-size: 13px;">Due ${input.dueDate}</td></tr>` : ""}
          </table>
          <p><a href="${input.appUrl}/tasks" style="color: #0f172a; font-weight: 600;">View your tasks →</a></p>
        </div>
      `,
    });
  } catch (err) {
    // Never let a notification failure break the task-assignment flow.
    console.error("Failed to send task assignment email:", err);
  }
}
