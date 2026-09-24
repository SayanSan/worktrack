import webpush from "web-push";
import type { createClient } from "@/lib/supabase/server";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:notifications@example.com";

const configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}

export async function sendTaskAssignedPush(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { userId: string; title: string; body: string; url: string }
) {
  if (!configured) {
    console.warn("VAPID keys not set — skipping push notification.");
    return;
  }

  const { data: subs } = await supabase.rpc("get_push_subscriptions", { target: input.userId });
  if (!subs || subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: input.title, body: input.body, url: input.url })
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | undefined)?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone (browser unsubscribed, uninstalled, etc.) — clean it up.
          await supabase.rpc("delete_push_subscription", { p_endpoint: sub.endpoint });
        } else {
          console.error("Failed to send push notification:", err);
        }
      }
    })
  );
}
