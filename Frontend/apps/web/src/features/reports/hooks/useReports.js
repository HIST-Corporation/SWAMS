import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAnalytics, fetchReport, fetchReportCsv } from '../api.js';
import { reportKeys } from './keys.js';
import { triggerBlobDownload } from '../../../lib/download.js';

/**
 * Period analytics for the /analytics screen. One query owns the whole
 * payload (§8.6): the trend chart, the hours bars, the day breakdown and the
 * summary tiles all read the same answer, so they can never disagree.
 */
export function useAnalytics({ period }) {
  const query = useQuery({
    queryKey: reportKeys.analytics(period),
    queryFn: () => fetchAnalytics({ period }),
    staleTime: 60_000,
  });
  return {
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    data: query.data ?? null,
  };
}

/**
 * One report for (type, from, to). The query is disabled while the range is
 * invalid so an impossible window never reaches the server.
 */
export function useReport({ type, from, to, enabled = true }) {
  const rangeInvalid = !from || !to || from > to;
  const query = useQuery({
    queryKey: reportKeys.report({ type, from, to }),
    queryFn: () => fetchReport({ type, from, to }),
    enabled: enabled && !rangeInvalid,
    staleTime: 15_000,
  });
  return {
    report: query.data ?? null,
    rows: query.data?.rows ?? [],
    summary: query.data?.summary ?? null,
    rangeInvalid,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * CSV export: the server (mock) renders the file from the same derivation as
 * the table, then the browser saves it. `status` drives the button honestly —
 * nothing downloads until the bytes arrive.
 */
export function useExportReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params) => {
      const blob = await fetchReportCsv(params);
      const filename = `swams-${params.type}-${params.from}_${params.to}.csv`;
      triggerBlobDownload(blob, filename);
      return { filename };
    },
    onSuccess: () => {
      // The export may be newer than the cached table — refresh both views.
      queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
