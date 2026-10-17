import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '../api.js';
import { notificationKeys } from './keys.js';

/**
 * The list behind the topbar bell (§7.10: unread → read → acted). The unread
 * count is derived from the same rows the panel renders, so the badge and the
 * list can never disagree.
 */
export function useNotifications() {
  const query = useQuery({
    queryKey: notificationKeys.list(),
    queryFn: fetchNotifications,
    staleTime: 60_000,
  });
  const rows = query.data?.rows ?? [];
  return {
    rows,
    unread: rows.filter((row) => !row.read).length,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Mark one row read. The query refetches so the server stays the truth. */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/** Mark everything read; the bell badge clears once the refetch lands. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
