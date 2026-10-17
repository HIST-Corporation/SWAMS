import { useEffect, useMemo } from 'react';
import { useActor } from '@xstate/react';
import { useQueryClient } from '@tanstack/react-query';
import { CORRECTION_STATES, createCorrectionMachine } from '../machines/correction.machine.js';
import { decideCorrection, submitCorrection } from '../api.js';

/**
 * Drives the requester side of a correction (§7.5). The machine owns the
 * workflow; this hook only performs the I/O and refetches the list once the
 * server has accepted something, so a new request appears without a manual
 * refresh.
 */
export function useCorrectionRequest() {
  const queryClient = useQueryClient();

  const machine = useMemo(
    () => createCorrectionMachine({ submitCorrection, decideCorrection }),
    [],
  );

  const [state, send, actor] = useActor(machine);

  useEffect(() => {
    const sub = actor.subscribe((snap) => {
      const settled =
        snap.matches('inReview') ||
        snap.matches('approved') ||
        snap.matches('rejected') ||
        snap.matches('needsInfo');
      if (settled) queryClient.invalidateQueries({ queryKey: ['attendance', 'corrections'] });
    });
    return () => sub.unsubscribe();
  }, [actor, queryClient]);

  return {
    status: CORRECTION_STATES.find((name) => state.matches(name)) ?? 'draft',
    context: state.context,
    send,
  };
}
