"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query-client";
import { TooltipProvider } from "@/components/ui/tooltip";

// ── Providers
// All global context providers are composed here.
// Keep this file thin — do not put business logic here.

export function Providers({ children }: { children: React.ReactNode }) {
  // Stable query client that survives re-renders
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>

      {/* Toast notifications — bottom-right, at most 2 at once (design brief §9) */}
      <Toaster
        position="bottom-right"
        visibleToasts={2}
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          classNames: {
            toast:
              "font-sans text-sm border border-border shadow-card",
            title: "font-medium",
            description: "text-muted-foreground",
          },
        }}
      />

      {/* Query devtools — development only, opt-in with NEXT_PUBLIC_QUERY_DEVTOOLS=true.
          Bottom-left sat on the sidebar's Log out; bottom-right is taken by the Next.js indicator. */}
      {process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_QUERY_DEVTOOLS === "true" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-left" />
      )}
    </QueryClientProvider>
  );
}