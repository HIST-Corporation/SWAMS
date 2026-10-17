/** Query-key factory for the audit feature (Section 10, Data). */
export const auditKeys = {
  all: ['audit'],
  entries: (filter = {}) => ['audit', 'entries', filter],
};
