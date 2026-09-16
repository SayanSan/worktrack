import nodemailer from "nodemailer";

// Sends via a real Gmail/Google Workspace mailbox (an "app password", not the
// account password) instead of a transactional email provider — no domain
// verification needed, and it can deliver to any recipient immediately.
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })
    : null;

export async function sendTaskAssignedEmail(input: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  assignedByName: string;
  dueDate: string | null;
  appUrl: string;
}) {
  if (!transporter) {
    console.warn("GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping task assignment email.");
    return;
  }

  try {
    await transporter.sendMail({
      from: `WorkTrack <${GMAIL_USER}>`,
      to: input.to,
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
