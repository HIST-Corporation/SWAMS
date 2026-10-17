import { useQuery } from '@tanstack/react-query';
import {
  fetchLeaveBalance,
  fetchOrgDashboard,
  fetchOrgOverview,
  fetchPresence,
  fetchStaffBoard,
  fetchTodayTasks,
  fetchUpcoming,
} from '../api.js';
import { dashboardKeys } from './keys.js';

/**
 * Each widget owns one query with an `enabled` flag, so an org without the
 * entitlement never fires the request and never renders an empty section
 * (Section 8.5: hidden, not empty).
 */
export function useTodayTasks({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: dashboardKeys.tasksToday(),
    queryFn: fetchTodayTasks,
    enabled,
    staleTime: 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    rows: query.data?.rows ?? [],
  };
}

/** First row of the balance payload; `null` while unknown or absent. */
export function useLeaveBalance({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: dashboardKeys.leaveBalance(),
    queryFn: fetchLeaveBalance,
    enabled,
    staleTime: 5 * 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    balance: query.data?.rows?.[0] ?? null,
  };
}

export function usePresence({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: dashboardKeys.presence(),
    queryFn: fetchPresence,
    enabled,
    staleTime: 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    rows: query.data?.rows ?? [],
  };
}

/** Org counters behind the Home hero; `null` until the payload arrives. */
export function useOrgOverview({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: dashboardKeys.orgOverview(),
    queryFn: fetchOrgOverview,
    enabled,
    staleTime: 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    overview: query.data ?? null,
  };
}

/**
 * The whole-company board. Reviewer-only: staff Home never mounts the sections
 * that read it, so the query never fires for them (Section 4.1).
 */
export function useOrgDashboard({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: dashboardKeys.orgDashboard(),
    queryFn: fetchOrgDashboard,
    enabled,
    staleTime: 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    board: query.data ?? null,
  };
}

/** Meetings, leave and holidays ahead — the Home "Coming up" rail. */
export function useUpcoming({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: dashboardKeys.upcoming(),
    queryFn: fetchUpcoming,
    enabled,
    staleTime: 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    rows: query.data?.rows ?? [],
  };
}

/**
 * The signed-in staff persona's work board (contract request 26). `staffRole`
 * comes from the session, never from a component's guess: without one there is
 * no board to fetch, so the query stays disabled instead of asking for a
 * persona the session is not (Section 4.1 — hidden, not empty).
 */
export function useStaffBoard({ staffRole, enabled = true } = {}) {
  const query = useQuery({
    queryKey: dashboardKeys.staffBoard(staffRole),
    queryFn: fetchStaffBoard,
    enabled: enabled && Boolean(staffRole),
    staleTime: 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    board: query.data ?? null,
  };
}
