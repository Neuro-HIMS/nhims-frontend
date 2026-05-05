"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { makeQueryClient } from "@/lib/query-client";

// ── Providers
// All global context providers are composed here.
// Keep this file thin — do not put business logic here.

export function Providers({ children }: { children: React.ReactNode }) {
  // Stable query client that survives re-renders
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}

      {/* Toast notifications — Sonner is lighter than shadcn Toaster for our needs */}
      <Toaster
        position="top-right"
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

      {/* Query devtools — only in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  );
}