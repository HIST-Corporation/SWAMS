import { useEffect, useMemo } from 'react';
import { useActor } from '@xstate/react';
import { useQueryClient } from '@tanstack/react-query';
import { isOfflineError } from '@swams/api-client';
import { createPunchMachine } from '../machines/punch.machine.js';
import { createOfflineQueueMachine } from '../machines/offline-queue.machine.js';
import { postPunch } from '../api.js';
import { loadQueue, saveQueue } from '../queueStorage.js';
import { evaluatePreflight, readLocation } from '../policy.js';
import { attendanceKeys } from '../keys.js';
import { noteFirstPunch } from '../../../lib/installPrompt.js';

/** `crypto.randomUUID` is unavailable in older WebViews; keep a fallback. */
function newKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `pk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** The queue item that represents one punch attempt. */
const toQueueItem = (pending) => ({
  id: pending.idempotencyKey,
  idempotencyKey: pending.idempotencyKey,
  kind: pending.kind === 'out' ? 'out' : 'in',
  clientTs: pending.clientTs,
  location: pending.location ?? null,
});

/**
 * Punch orchestration (Section 7.1 + 7.2). One source of truth per concern:
 *  - the punch machine owns the *user-visible* flow (checking → … → working)
 *  - the offline queue machine owns *unsent punches* (ordering, dedupe, retry)
 *
 * The hook glues them: an attempt that fails offline is enqueued, and a flush
 * posts the queue in order and reports conflicts back to the punch machine.
 *
 * @param {{ site?: object|null, policy?: object|null }} [options]
 */
export function usePunch({ site = null, policy = null } = {}) {
  const queryClient = useQueryClient();

  /** The queue's poster: sequential so a clock-out can never overtake its clock-in. */
  const poster = useMemo(
    () =>
      async function postQueueItems(items) {
        const sent = [];
        const failed = [];
        for (const item of items) {
          try {
            const result = await postPunch(item);
            sent.push(item.id);
            if (result?.needsReview)
              failed.push({ id: item.id, reason: result.reason ?? 'review' });
          } catch (error) {
            // Network trouble is not a rejection: rethrow so the queue keeps the
            // item and the punch machine returns to `queued`.
            if (isOfflineError(error)) throw error;
            failed.push({ id: item.id, reason: error.code ?? 'rejected' });
          }
        }
        return { sent, failed };
      },
    [],
  );

  const queueMachine = useMemo(
    () =>
      createOfflineQueueMachine({
        flush: poster,
        // Unsent punches survive a hard reload through the storage adapter
        // (PWA slice, §7.2); anything the adapter drops stays dropped.
        initialItems: loadQueue(),
      }),
    [poster],
  );
  const [queueState, queueSend, queueActor] = useActor(queueMachine);

  // Persist the unsent tail on every queue change — a reload while offline
  // resumes from storage, and `sent` items never linger on disk.
  useEffect(() => {
    saveQueue(queueState.context.items);
  }, [queueState]);

  const punchMachine = useMemo(
    () =>
      createPunchMachine({
        // Pre-flight is advisory: the server still decides on the punch (§7.1).
        checkPolicy: async ({ kind }) => {
          const { location, permission } = policy?.requiresLocation
            ? await readLocation()
            : { location: null, permission: null };
          return { ...evaluatePreflight({ policy, location, permission, site }), location, kind };
        },
        submitPunch: async ({ kind, idempotencyKey, clientTs }) => {
          const { location } = policy?.requiresLocation ? await readLocation() : { location: null };
          return postPunch({ kind, idempotencyKey, clientTs, location });
        },
        newKey,
      }),
    [policy, site],
  );

  const [state, send, actor] = useActor(punchMachine);

  // Enqueue an attempt the moment it is queued, so an unsent punch survives a
  // reload through the queue (and appears in the sync chip). Also refetch
  // `today` whenever the server confirms a punch — otherwise the card would
  // keep rendering the session it just ended.
  useEffect(() => {
    let lastPunchId = null;
    const sub = actor.subscribe((snap) => {
      if (snap.matches('queued') && snap.context.pending) {
        queueSend({ type: 'ENQUEUE', item: toQueueItem(snap.context.pending) });
      }
      const punchId = snap.context.lastPunch?.id ?? null;
      if (punchId && punchId !== lastPunchId) {
        lastPunchId = punchId;
        // The first confirmed punch unlocks the install offer (§11.8) — the
        // one moment the app has proved it is worth keeping on the home screen.
        noteFirstPunch();
        queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
        queryClient.invalidateQueries({ queryKey: attendanceKeys.history() });
      }
    });
    return () => sub.unsubscribe();
  }, [actor, queueSend, queryClient]);

  // While the punch machine is `syncing`, flush the queue and report back.
  // The machine owns the visible state; this effect owns the network work.
  useEffect(() => {
    if (!state.matches('syncing')) return undefined;
    const actorRef = queueActor;
    const subscription = actorRef.subscribe((snap) => {
      if (snap.matches('online') || snap.matches('partialFailure')) {
        subscription.unsubscribe();
        send({ type: 'FLUSH_DONE', conflicts: snap.context.lastFlush?.failed ?? 0 });
        queryClient.invalidateQueries({ queryKey: attendanceKeys.today() });
        queryClient.invalidateQueries({ queryKey: attendanceKeys.history() });
      } else if (snap.matches('flushFailed')) {
        subscription.unsubscribe();
        send({ type: 'FLUSH_FAILED', error: new Error(snap.context.lastError ?? 'sync failed') });
      }
    });
    queueSend({ type: 'FLUSH' });
    return () => subscription.unsubscribe();
  }, [state, queueActor, queueSend, send, queryClient]);

  // Connectivity drives the queue; the punch machine listens for ONLINE itself.
  useEffect(() => {
    const goOffline = () => queueSend({ type: 'GO_OFFLINE' });
    const goOnline = () => {
      queueSend({ type: 'GO_ONLINE' });
      send({ type: 'ONLINE' });
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [queueSend, send]);

  return {
    status: String(
      [
        'idle',
        'checking',
        'permissionHelp',
        'submitting',
        'queued',
        'syncing',
        'working',
        'onBreak',
        'confirmOut',
        'needsReview',
        'error',
      ].find((name) => state.matches(name)) ?? 'idle',
    ),
    context: state.context,
    send,
    /** Queued/unsent punches for the sync chip (Section 7.2 surface). */
    queued: queueState.context.items.filter((item) => item.status !== 'sent'),
    queueSend,
  };
}
