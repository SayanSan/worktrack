"use client";

import { useEffect, useState } from "react";
import { Bell, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { savePushSubscription } from "@/lib/actions/push";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const DISMISS_KEY = "worktrack-push-dismissed";

type Banner = "none" | "enable" | "ios-install";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function initialBanner(): Banner {
  if (typeof window === "undefined") return "none";
  if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator)) return "none";
  if (localStorage.getItem(DISMISS_KEY)) return "none";
  if (isIOS() && !isStandalone()) return "ios-install";
  if (!("PushManager" in window)) return "none";
  if (Notification.permission !== "default") return "none";
  return "enable";
}

export function PushNotifications() {
  const [banner, setBanner] = useState<Banner>(initialBanner);
  const [busy, setBusy] = useState(false);

  // Side effects only — registering the SW, and silently re-saving an
  // already-granted subscription. Which banner (if any) to show is computed
  // up front in initialBanner(), not set here.
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    if (Notification.permission === "granted" && "PushManager" in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await savePushSubscription(
            existing.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
          );
        }
      });
    }
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        dismiss();
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await savePushSubscription(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setBanner("none");
    } catch (err) {
      console.error("Failed to enable notifications:", err);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setBanner("none");
  }

  if (banner === "none") return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:right-4 sm:left-auto">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Bell className="h-4 w-4" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        {banner === "enable" ? (
          <>
            <p className="text-sm font-medium text-slate-900">Get notified on this device</p>
            <p className="mt-0.5 text-xs text-slate-500">
              We&apos;ll alert you here when someone assigns you a task.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={enable} disabled={busy}>
                {busy ? "Enabling…" : "Enable"}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-900">Add to Home Screen for alerts</p>
            <p className="mt-0.5 text-xs text-slate-500">
              On iPhone, notifications only work if WorkTrack is added to your Home Screen: tap{" "}
              <Share className="inline h-3 w-3 -translate-y-px" strokeWidth={2} /> in Safari, then
              &quot;Add to Home Screen&quot;.
            </p>
            <div className="mt-3">
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Got it
              </Button>
            </div>
          </>
        )}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );
}
