/**
 * Query-key factory for the attendance feature (Section 10, Data).
 *
 * `history` is called once with the page size the week strip needs (a whole
 * week of days) and once per page for the history list, so the two share one
 * cache entry rather than each fetching its own copy of the same days.
 */
export const attendanceKeys = {
  all: ['attendance'],
  today: () => ['attendance', 'today'],
  policy: () => ['attendance', 'policy'],
  history: (params = {}) => ['attendance', 'history', params],
  corrections: (params = {}) => ['attendance', 'corrections', params],
  team: (date) => ['attendance', 'team', date ?? null],
  calendar: (month) => ['attendance', 'calendar', month],
};
