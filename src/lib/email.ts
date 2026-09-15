import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Resend's shared sandbox sender — works with no domain setup, but only reaches
// the email address on your Resend account until you verify your own domain.
// Swap in a verified "you@yourdomain.com" via RESEND_FROM_EMAIL once you have one.
const FROM = process.env.RESEND_FROM_EMAIL || "WorkTrack <onboarding@resend.dev>";

export async function sendTaskAssignedEmail(input: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  projectName: string;
  assignedByName: string;
  dueDate: string | null;
  appUrl: string;
}) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set — skipping task assignment email.");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM,
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
