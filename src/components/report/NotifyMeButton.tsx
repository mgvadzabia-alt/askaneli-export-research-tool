"use client";

import { useState, useSyncExternalStore } from "react";

/** localStorage key for "notify me" opt-in, scoped per report id. */
function storageKey(id: string): string {
  return `askaneli-notify-${id}`;
}

/** Reads whether the user opted in to a browser notification for this report. */
export function isNotifyOptedIn(id: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(storageKey(id)) === "1";
}

function clearOptIn(id: string): void {
  window.localStorage.removeItem(storageKey(id));
}

// No real subscription exists for "did Notification support/permission/opt-in
// change" — these are read once and re-read after any local state update this
// component causes. useSyncExternalStore's server/client snapshot split is
// used purely to avoid a hydration mismatch (server has no `window`), not to
// subscribe to external change events.
const noSubscription = () => () => {};

function getSupportSnapshot(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}
function getServerSupportSnapshot(): boolean {
  return false;
}

function getPermissionSnapshot(): NotificationPermission {
  return getSupportSnapshot() ? Notification.permission : "default";
}
function getServerPermissionSnapshot(): NotificationPermission {
  return "default";
}

/**
 * Lets the user opt in to a browser (desktop) notification for when this
 * report finishes, instead of having to keep the tab in view. No server or
 * external service involved — just the standard browser Notification API,
 * which requires a one-time permission grant per site.
 *
 * Only meaningful while the report is still running; ReportPoller checks the
 * same opt-in flag and fires the actual notification when status changes.
 */
export function NotifyMeButton({ id }: { id: string }) {
  const supported = useSyncExternalStore(
    noSubscription,
    getSupportSnapshot,
    getServerSupportSnapshot
  );
  const permission = useSyncExternalStore(
    noSubscription,
    getPermissionSnapshot,
    getServerPermissionSnapshot
  );
  const optedInFromStorage = useSyncExternalStore(
    noSubscription,
    () => isNotifyOptedIn(id),
    () => false
  );
  // Bumped after any local mutation (permission request, opt-in/out) so the
  // useSyncExternalStore reads above re-run and pick up the fresh value —
  // a plain event-handler state update, not something set from an effect.
  const [, forceRecheck] = useState(0);

  if (!supported) return null;

  async function handleClick() {
    if (optedInFromStorage) {
      clearOptIn(id);
      forceRecheck((n) => n + 1);
      return;
    }

    let result = Notification.permission;
    if (result === "default") {
      result = await Notification.requestPermission();
    }
    if (result === "granted") {
      window.localStorage.setItem(storageKey(id), "1");
    }
    forceRecheck((n) => n + 1);
  }

  if (permission === "denied") {
    return (
      <span
        className="text-xs text-neutral-400"
        title="Notifications are blocked in your browser settings"
      >
        Notifications blocked
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium shadow-sm print:hidden ${
        optedInFromStorage
          ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
      }`}
    >
      {optedInFromStorage ? "🔔 Notifying you" : "🔕 Notify me when ready"}
    </button>
  );
}
