import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

import { EmptyState, type EmptyStateProps } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";

interface QueryStateProps<T> {
  query: Pick<UseQueryResult<T>, "data" | "isPending" | "isError" | "error" | "refetch">;
  skeleton: ReactNode;
  empty: EmptyStateProps;
  /** Defaults to "array is empty" — override for non-array data. */
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

/** Wraps one query so loading/empty/error/success are never forgotten (design brief §8). */
export function QueryState<T>({ query, skeleton, empty, isEmpty, children }: QueryStateProps<T>) {
  if (query.isPending) return <>{skeleton}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;

  const data = query.data as T;
  const empty_ = isEmpty ? isEmpty(data) : Array.isArray(data) && data.length === 0;
  if (empty_) return <EmptyState {...empty} />;

  return <>{children(data)}</>;
}
