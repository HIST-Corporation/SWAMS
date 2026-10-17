import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { weekSeries, weekStats } from '../weekStats.js';
import {
  decideCorrection,
  fetchAttendanceCalendar,
  fetchAttendanceHistory,
  fetchAttendancePolicy,
  fetchAttendanceToday,
  fetchCorrections,
  fetchTeamAttendance,
} from '../api.js';
import { attendanceKeys } from '../keys.js';

/** Days in the week the strip draws (a full Nepal week, Sunday to Saturday). */
const WEEK_DAYS = 7;

/** Today's session + the site/schedule the punch card renders (§7.1). */
export function useAttendanceToday({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: attendanceKeys.today(),
    queryFn: fetchAttendanceToday,
    enabled,
    staleTime: 30_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    session: query.data?.session ?? null,
    site: query.data?.site ?? null,
    schedule: query.data?.schedule ?? null,
  };
}

/** Org punch policy — decides whether the pre-flight asks for location. */
export function useAttendancePolicy() {
  const query = useQuery({
    queryKey: attendanceKeys.policy(),
    queryFn: fetchAttendancePolicy,
    staleTime: 5 * 60_000,
  });
  return {
    isLoading: query.isLoading,
    policy: query.data ?? null,
    sites: query.data?.sites ?? [],
  };
}

/**
 * Today's board for a manager or HR lens (§8.6). One request owns presence,
 * exceptions and the summary so the three can never disagree on screen.
 */
export function useTeamAttendance({ date = null } = {}) {
  const query = useQuery({
    queryKey: attendanceKeys.team(date),
    queryFn: () => fetchTeamAttendance({ date }),
    staleTime: 30_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    rows: query.data?.rows ?? [],
    summary: query.data?.summary ?? null,
  };
}

/**
 * Correction records (§7.5). `status: 'pending'` is the reviewer queue;
 * `'mine'` is what the requester has asked for.
 */
export function useCorrections({ status = 'all', enabled = true } = {}) {
  const query = useQuery({
    queryKey: attendanceKeys.corrections({ status }),
    queryFn: () => fetchCorrections({ status }),
    staleTime: 15_000,
    // A role that cannot review must not fire the reviewer query at all.
    enabled,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    rows: query.data?.rows ?? [],
  };
}

/**
 * A reviewer's decision. Never optimistic: the record's status is the server's
 * to state (§7.5), so the queue simply refetches once the API answers.
 */
export function useDecideCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: decideCorrection,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'corrections'] });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
      queryClient.invalidateQueries({ queryKey: attendanceKeys.history() });
    },
  });
}

const PAGE_SIZE = 10;

/**
 * This week's days, for the strip under the punch card (§9.9: no fake charts).
 *
 * One page of the history query, sized to a full week and sorted oldest-first
 * so the strip reads left to right. It is derived from history rather than a
 * second endpoint, so the strip and the history table can never disagree about
 * a day (§7.6). `days` is the server's rows for this week only; `elapsed` is
 * how far into the week we are, so a caller can show the days still to come
 * instead of reading an unfinished week as a collapse.
 *
 * @param {Date} [now]
 */
export function useWeekStrip({ now = new Date() } = {}) {
  const query = useQuery({
    queryKey: attendanceKeys.history({ week: true }),
    queryFn: () => fetchAttendanceHistory({ page: 1, perPage: WEEK_DAYS }),
    staleTime: 60_000,
  });

  const rows = query.data?.rows ?? [];
  const { minutes, days, elapsed, start } = weekStats(rows, now);

  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    /** The seven days of this week, oldest first; a gap stays a real zero. */
    days: weekSeries(rows, now),
    /** Days this week that have recorded time so far. */
    workedDays: days,
    /** How far into the week we are: 1 on Sunday, 7 once Saturday is done. */
    elapsed,
    /** Week-to-date minutes, straight from the server's own rows. */
    minutes,
    start,
  };
}

/** Paged attendance history (§10.4) — infinite so mobile gets a load-more list. */
export function useAttendanceHistory({ perPage = PAGE_SIZE } = {}) {
  const query = useInfiniteQuery({
    queryKey: attendanceKeys.history({ perPage }),
    queryFn: ({ pageParam }) => fetchAttendanceHistory({ page: pageParam, perPage }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last?.hasMore ? pages.length + 1 : undefined),
    staleTime: 60_000,
  });

  return {
    isLoading: query.isLoading,
    isFetchingMore: query.isFetchingNextPage,
    error: query.error,
    refetch: query.refetch,
    hasMore: Boolean(query.hasNextPage),
    fetchMore: query.fetchNextPage,
    rows: (query.data?.pages ?? []).flatMap((page) => page.rows ?? []),
  };
}

/**
 * One calendar month of day statuses for the month calendar on /attendance.
 * The payload is the server's own per-day status — the client never derives a
 * day's status from another screen's rows (§7.6); a `null` status means the
 * day has not happened yet.
 * @param {{ month: string }} params `YYYY-MM`
 */
export function useAttendanceMonth({ month }) {
  const query = useQuery({
    queryKey: attendanceKeys.calendar(month),
    queryFn: () => fetchAttendanceCalendar({ month }),
    enabled: /^\d{4}-\d{2}$/.test(month ?? ''),
    staleTime: 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    days: query.data?.days ?? [],
  };
}
