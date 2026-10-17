import { api } from '../../lib/apiClient.js';

/**
 * Video room API (Section 5: components never call fetch). Only what the room
 * genuinely posts exists here — the provider adapter and meeting token are
 * still to come (screen inventory), so no call is ever *placed* from this
 * feature.
 */

/** Send a call request into a teammate's notification bell (contract request 17's shape). */
export async function sendCallRequest({ name }) {
  return (
    await api.post('/notifications', {
      kind: 'call',
      key: 'callRequested',
      params: { name },
      link: '/video',
    })
  ).data;
}
