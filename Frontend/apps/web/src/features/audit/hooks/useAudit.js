import { useQuery } from '@tanstack/react-query';
import { fetchAuditEntries } from '../api.js';
import { auditKeys } from './keys.js';

/**
 * One page of the audit log. Pagination and filters stay server-side (§7.2):
 * the page number reset is the caller's job when a filter changes.
 * @param {{ page?: number, perPage?: number, action?: string, actor?: string, enabled?: boolean }} [options]
 */
export function useAuditEntries({ page = 1, perPage = 10, action, actor, enabled = true } = {}) {
  const normalized = {
    page: Math.max(1, page),
    perPage,
    action: action || undefined,
    actor: actor?.trim() || undefined,
  };
  const query = useQuery({
    queryKey: auditKeys.entries(normalized),
    queryFn: () => fetchAuditEntries(normalized),
    enabled,
    staleTime: 15_000,
  });
  return {
    rows: query.data?.rows ?? [],
    page: query.data?.page ?? normalized.page,
    totalPages: query.data?.totalPages ?? 1,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
