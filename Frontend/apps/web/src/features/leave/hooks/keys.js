/** Query-key factory for the leave feature (Section 10, Data). */
export const leaveKeys = {
  all: ['leave'],
  balance: () => ['leave', 'balance'],
  requests: (filter = {}) => ['leave', 'requests', filter],
  holidays: () => ['leave', 'holidays'],
};
