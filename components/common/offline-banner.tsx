"use client";

import { WifiOff } from "lucide-react";

interface OfflineBannerProps {
  queueCount: number;
}

export function OfflineBanner({ queueCount }: OfflineBannerProps) {
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        You&apos;re offline. Your work is being saved on this computer and will send when the internet is back.
        {queueCount > 0 && (
          <> {queueCount} thing{queueCount !== 1 ? "s" : ""} waiting to send.</>
        )}
      </span>
    </div>
  );
}