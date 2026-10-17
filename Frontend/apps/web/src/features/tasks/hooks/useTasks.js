import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addChecklistItem,
  applyTaskTemplate,
  closeTask,
  createLane,
  createTask,
  createTaskTemplate,
  deleteLane,
  deleteTask,
  deleteTaskTemplate,
  fetchTasks,
  fetchTaskTemplates,
  patchTaskLane,
  removeChecklistItem,
  setChecklistItem,
  updateLane,
  updateTask,
} from '../api.js';
import { taskKeys } from './keys.js';

/**
 * The board behind `/work/tasks`. One query owns every lane so a move is a
 * single cache patch, never five competing queries (§7.6). The payload also
 * carries the column configuration, the revision trail and the session's
 * scope (`self` for staff, `all` for managers/HR) — the server decides all
 * three, the page only echoes them.
 */
export function useTaskBoard({ enabled = true } = {}) {
  const query = useQuery({
    queryKey: taskKeys.board(),
    queryFn: fetchTasks,
    enabled,
    staleTime: 15_000,
  });
  return {
    rows: query.data?.rows ?? [],
    completed: query.data?.completed ?? [],
    lanes: query.data?.lanes ?? [],
    revisions: query.data?.revisions ?? [],
    scope: query.data?.scope ?? null,
    canManage: query.data?.canManage === true,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/** Add a board column (manager/HR only). Never optimistic — the id is the server's. */
export function useCreateLane({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createLane,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error),
  });
}

/** Rename a column / set its WIP limit. The row shows the server's record. */
export function useUpdateLane({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLane,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error),
  });
}

/**
 * Move a task with the §7.6 lifecycle: optimistic lane update (dropping) that
 * either settles or rolls back to the snapshot with the server's reason —
 * reported through `onError` for the board's live region, never invented.
 */
/** Delete a column (manager/HR only). The column's tasks move to the first
 * remaining lane so nothing is lost (§7.6). */
export function useDeleteLane({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteLane,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const previous = queryClient.getQueryData(taskKeys.board());
      if (!previous) return { previous };
      const deletedIndex = previous.lanes.findIndex((lane) => lane.id === id);
      if (deletedIndex === -1) return { previous };
      const firstRemaining = previous.lanes.find((lane, index) => index !== deletedIndex)?.id ?? null;
      const rows = previous.rows.map((row) =>
        row.lane === id && firstRemaining ? { ...row, lane: firstRemaining } : row,
      );
      const next = {
        ...previous,
        lanes: previous.lanes.filter((_lane, index) => index !== deletedIndex),
        rows,
      };
      queryClient.setQueryData(taskKeys.board(), next);
      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(taskKeys.board(), context.previous);
      }
      onError?.(error);
    },
    onSuccess: (response) => {
      onSuccess?.(response);
    },
  });
}


/** Delete a task (manager/HR only; the owner or a reviewer may also delete it). */
export function useDeleteTask({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTask,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const previous = queryClient.getQueryData(taskKeys.board());
      if (!previous) return { previous };
      const next = previous.rows.filter((row) => row.id !== id);
      queryClient.setQueryData(taskKeys.board(), { ...previous, rows: next });
      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(taskKeys.board(), context.previous);
      }
      onError?.(error);
    },
    onSuccess: (response) => {
      onSuccess?.(response);
    },
  });
}

/**
 * Close a finished task into the completed history. Optimistic the same way
 * delete is — the card leaves the column at once and lands in the history
 * stamped — and rolls back with the server's reason if the write is refused.
 */
export function useCloseTask({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closeTask,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const previous = queryClient.getQueryData(taskKeys.board());
      if (!previous) return { previous };
      const row = previous.rows.find((candidate) => candidate.id === id);
      if (!row) return { previous };
      const stamped = { ...row, closedAt: new Date().toISOString() };
      queryClient.setQueryData(taskKeys.board(), {
        ...previous,
        rows: previous.rows.filter((candidate) => candidate.id !== id),
        completed: [stamped, ...(previous.completed ?? [])],
      });
      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(taskKeys.board(), context.previous);
      }
      onError?.(error);
    },
    onSuccess: (response) => {
      onSuccess?.(response);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}
export function useMoveTask({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchTaskLane,
    onMutate: async ({ id, lane }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const previous = queryClient.getQueryData(taskKeys.board());
      queryClient.setQueryData(taskKeys.board(), (old) =>
        old
          ? { ...old, rows: old.rows.map((row) => (row.id === id ? { ...row, lane } : row)) }
          : old,
      );
      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(taskKeys.board(), context.previous);
      }
      onError?.(error);
    },
    onSuccess: (response, variables) => onSuccess?.(response, variables),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

/**
 * Create a task. Never optimistic — the new card renders once the server
 * returns it, and the board refetches so the server stays the truth.
 */
export function useCreateTask({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTask,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      onSuccess?.(response);
    },
    onError: (error) => onError?.(error),
  });
}

/**
 * Fold one server `record` into the cached board so a detail write shows up on
 * the card immediately; the settle-time refetch still overrules us later.
 * The write is `record → row`, never a second copy of the task.
 */
function mergeRecord(queryClient, record) {
  queryClient.setQueryData(taskKeys.board(), (old) => {
    if (!old) return old;
    const known = old.rows.some((row) => row.id === record.id);
    return {
      ...old,
      rows: known
        ? old.rows.map((row) => (row.id === record.id ? { ...row, ...record } : row))
        : [record, ...old.rows],
    };
  });
}

/**
 * Field edits and lane moves from the detail panel (contract request 22).
 * Deliberately NOT optimistic: the server validates the whole patch at once
 * (a reviewer is required for Review, a note for Revision), and the panel
 * renders the record it returns — a refused edit can never flash as saved.
 */
export function useUpdateTask({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTask,
    onSuccess: (response, variables) => {
      mergeRecord(queryClient, response.record);
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      onSuccess?.(response, variables);
    },
    onError: (error, variables) => onError?.(error, variables),
  });
}

/**
 * The checklist inside a task ("to-do list"). Ticking is optimistic because it
 * is small, frequent and reversible — the card's `2/5` moves with it and rolls
 * back with the server's reason if the write is refused. Add and remove are
 * not optimistic: the new item's id comes from the server.
 */
export function useChecklist({ onSuccess, onError } = {}) {
  const queryClient = useQueryClient();
  const accepted = (response, action) => {
    mergeRecord(queryClient, response.record);
    onSuccess?.(action);
  };

  const add = useMutation({
    mutationFn: addChecklistItem,
    onSuccess: (response) => accepted(response, 'add'),
    onError: (error) => onError?.(error),
  });

  const toggle = useMutation({
    mutationFn: setChecklistItem,
    onMutate: async ({ id, itemId, done }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const previous = queryClient.getQueryData(taskKeys.board());
      queryClient.setQueryData(taskKeys.board(), (old) =>
        old
          ? {
              ...old,
              rows: old.rows.map((row) =>
                row.id === id
                  ? {
                      ...row,
                      checklist: (row.checklist ?? []).map((item) =>
                        item.id === itemId ? { ...item, done } : item,
                      ),
                    }
                  : row,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (error, variables, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(taskKeys.board(), context.previous);
      }
      onError?.(error);
    },
    onSuccess: (response) => accepted(response, 'toggle'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });

  const remove = useMutation({
    mutationFn: removeChecklistItem,
    onSuccess: (response) => accepted(response, 'remove'),
    onError: (error) => onError?.(error),
  });

  return { add, toggle, remove };
}

/** The available and owned board templates, plus the mutations that shape them. */
export function useTaskTemplates({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: taskKeys.templates(),
    queryFn: fetchTaskTemplates,
    enabled,
    staleTime: 60_000,
  });

  const templates = data?.templates ?? [];
  const customTemplates = data?.customTemplates ?? [];

  const save = useMutation({
    mutationFn: createTaskTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
    },
  });

  const apply = useMutation({
    mutationFn: applyTaskTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
    },
  });

  const remove = useMutation({
    mutationFn: deleteTaskTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.templates() });
    },
  });

  return {
    templates,
    customTemplates,
    isLoading,
    error,
    refetch,
    save,
    apply,
    remove,
  };
}

