"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { isNotifyOptedIn } from "./NotifyMeButton";

/**
 * Fires a browser notification if the user opted in via NotifyMeButton and
 * permission is currently granted. Best-effort: does nothing if unsupported,
 * not opted in, or permission was revoked since opting in.
 */
function notifyIfOptedIn(id: string, country: string, product: string, status: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!isNotifyOptedIn(id)) return;

  const title = status === "done" ? "Report ready" : "Report generation failed";
  const body = `${country} — ${product}`;
  try {
    const notification = new Notification(title, { body, tag: `askaneli-report-${id}` });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some contexts (e.g. background service worker requirements on mobile
    // Chrome) can reject direct `new Notification(...)` — fail silently
    // rather than breaking the page over a best-effort notification.
  }
}

/**
 * While a report is still "running", polls its status endpoint and refreshes
 * the (server-rendered) page as soon as it flips to "done" or "error". Also
 * fires an opt-in browser notification at that point (see NotifyMeButton).
 */
export function ReportPoller({
  id,
  country,
  product,
}: {
  id: string;
  country: string;
  product: string;
}) {
  const router = useRouter();
  const stoppedRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (stoppedRef.current) return;
      try {
        const res = await fetch(`/api/reports/${id}`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { entry?: { status?: string } };
          if (data.entry?.status && data.entry.status !== "running") {
            stoppedRef.current = true;
            notifyIfOptedIn(id, country, product, data.entry.status);
            router.refresh();
            return;
          }
        }
      } catch {
        // transient fetch error while polling — just try again on the next tick
      }
      timer = setTimeout(poll, 5000);
    }

    timer = setTimeout(poll, 5000);
    return () => {
      stoppedRef.current = true;
      clearTimeout(timer);
    };
  }, [id, country, product, router]);

  return null;
}
