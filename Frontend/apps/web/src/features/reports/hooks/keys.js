/** Query-key factory for the reports feature (Section 10, Data). */
export const reportKeys = {
  all: ['reports'],
  report: (filter = {}) => ['reports', 'report', filter],
  analytics: (period) => ['reports', 'analytics', period],
};
