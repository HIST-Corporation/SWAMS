import { useQuery } from '@tanstack/react-query';
import { fetchCalendar } from '../api.js';
import { calendarKeys } from './keys.js';

/**
 * One range of event-bearing days. `range` is always a valid pair of ISO
 * bounds from the page's month cursor, so the hook never builds an impossible
 * window — filtering stays server-side, the grid stays dumb.
 * @param {{ from?: string, to?: string, enabled?: boolean }} [options]
 */
export function useCalendar({ from, to, enabled = true } = {}) {
  const query = useQuery({
    queryKey: calendarKeys.range({ from, to }),
    queryFn: () => fetchCalendar({ from, to }),
    enabled: enabled && Boolean(from && to),
    staleTime: 30_000,
  });
  const byDate = new Map();
  for (const day of query.data?.days ?? []) byDate.set(day.date, day.events);
  return {
    days: query.data?.days ?? [],
    holidays: query.data?.holidays ?? [],
    byDate,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
