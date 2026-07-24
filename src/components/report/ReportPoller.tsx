"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * While a report is still "running", polls its status endpoint and refreshes
 * the (server-rendered) page as soon as it flips to "done" or "error".
 */
export function ReportPoller({ id }: { id: string }) {
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
  }, [id, router]);

  return null;
}
