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
        Offline mode — working from local cache.
        {queueCount > 0 && (
          <> {queueCount} action{queueCount !== 1 ? "s" : ""} queued for sync.</>
        )}
      </span>
    </div>
  );
}