import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/apiClient.js';
import { appKeys } from '../lib/keys.js';

/**
 * Session hook (Section 5): one query owns auth/org/preferences state.
 * The fixture backend (MSW) returns a mock session until auth lands in
 * build order 2 — clearly labeled in src/mocks/fixtures.js.
 */
export function useSession() {
  const query = useQuery({
    queryKey: appKeys.session,
    queryFn: async () => (await api.get('/me')).data,
    staleTime: 5 * 60_000,
  });

  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    session: query.data ?? null,
    principal: query.data?.principal ?? null,
    user: query.data?.user ?? null,
    org: query.data?.org ?? null,
    entitlements: query.data?.entitlements ?? [],
  };
}
