import { api } from '../../lib/apiClient.js';

/**
 * Audit API (Section 5: components never call fetch — hooks go through here).
 * The shape is recorded in docs/api-contract/contract-requests.md (request 20)
 * and served by the labelled MSW fixtures in `mocks/` until the real API lands.
 */

/**
 * Audit entries, newest first, server-paginated.
 * @param {{ page?: number, perPage?: number, action?: string, actor?: string }} [params]
 * @returns {Promise<{rows: Array<{id: string, actor: string, entity: string, action: string, createdAt: string}>, page: number, perPage: number, total: number, totalPages: number}>}
 */
export async function fetchAuditEntries(params = {}) {
  return (await api.get('/audit', { params })).data;
}
