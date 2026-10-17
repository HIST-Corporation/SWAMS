import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decideLeaveRequest,
  fetchLeaveBalance,
  fetchLeaveHolidays,
  fetchLeaveRequests,
  submitLeaveRequest,
} from '../api.js';
import { leaveKeys } from './keys.js';

/**
 * Each query owns an `enabled` flag, so a role without the permission never
 * fires the request and never renders an empty section (§8.5: hidden, not empty).
 */

/** The signed-in person's balance. The server computes entitlements (§7.6). */
export function useLeaveBalance({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: leaveKeys.balance(),
    queryFn: fetchLeaveBalance,
    enabled,
    staleTime: 5 * 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    rows: query.data?.rows ?? [],
  };
}

/**
 * Leave requests. `status: 'pending'` is the reviewer bench; `'mine'` is what
 * the person asked for.
 */
export function useLeaveRequests({ status = 'mine', enabled = true } = {}) {
  const query = useQuery({
    queryKey: leaveKeys.requests({ status }),
    queryFn: () => fetchLeaveRequests({ status }),
    enabled,
    staleTime: 15_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    rows: query.data?.rows ?? [],
  };
}

/** Holidays, so the form can flag a date that is already a non-working day. */
export function useLeaveHolidays({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: leaveKeys.holidays(),
    queryFn: fetchLeaveHolidays,
    enabled,
    staleTime: 30 * 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    rows: query.data?.rows ?? [],
  };
}

/**
 * A reviewer's decision. Never optimistic — the record's status is the server's
 * to state (§7.5), so the queue refetches once the API answers.
 */
export function useDecideLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: decideLeaveRequest,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

/**
 * Submit a leave request. Kept as a plain mutation (not a machine) because the
 * flow has one transition and the list refetch carries the server's status.
 */
export function useSubmitLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}
