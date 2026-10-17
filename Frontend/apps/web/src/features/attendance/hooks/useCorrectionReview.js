import { useEffect, useMemo } from 'react';
import { useActor } from '@xstate/react';
import { useQueryClient } from '@tanstack/react-query';
import { CORRECTION_STATES, createCorrectionMachine } from '../machines/correction.machine.js';
import { decideCorrection } from '../api.js';

/** Reviewers only decide; submitting is never offered from this side. */
const NOT_A_REQUESTER = () =>
  Promise.reject(new Error('A reviewer cannot submit a correction request.'));

/**
 * Reviewer side of one correction record (§7.5). One machine per row, keyed on
 * the record's id and server status — never on the row object, so a background
 * refetch of the queue cannot restart a decision that is already in flight.
 * The row's authoritative status still comes from the query; this hook only
 * reports the decision's own state.
 *
 * @param {object} record a `GET /attendance/corrections` row
 */
export function useCorrectionReview(record) {
  const queryClient = useQueryClient();
  const { id, status: serverStatus } = record;

  const machine = useMemo(
    () =>
      createCorrectionMachine({
        submitCorrection: NOT_A_REQUESTER,
        decideCorrection,
        // Only the id and the server status steer the machine; the rest of the
        // row is rendered straight from the query.
        initial: { record: { id, status: serverStatus } },
      }),
    [id, serverStatus],
  );

  const [state, send, actor] = useActor(machine);

  useEffect(() => {
    const sub = actor.subscribe((snap) => {
      const settled =
        snap.matches('approved') || snap.matches('rejected') || snap.matches('needsInfo');
      if (settled) queryClient.invalidateQueries({ queryKey: ['attendance', 'corrections'] });
    });
    return () => sub.unsubscribe();
  }, [actor, queryClient]);

  return {
    status: CORRECTION_STATES.find((name) => state.matches(name)) ?? 'inReview',
    error: state.context.error,
    /** Approve / reject / ask a question — the note is required for the latter two. */
    decide: (decision, note) => {
      send({ type: 'START_REVIEW' });
      send({ type: 'DECISION', decision, note });
    },
    retry: () => send({ type: 'RETRY' }),
  };
}
