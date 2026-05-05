import { QueryClient } from "@tanstack/react-query";

/**
 * Factory so each server-render creates a fresh client.
 * On the client, this is called once inside useState.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 30 seconds
        staleTime: 30 * 1000,
        // Keep inactive data in cache for 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry once on failure — clinical system should not silently retry many times
        retry: 1,
        retryDelay: 1000,
        // Refetch on window focus — keeps clinical data current
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Do not retry mutations — clinical actions should not double-execute
        retry: 0,
      },
    },
  });
}