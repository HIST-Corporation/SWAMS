/** Query-key factory for the calendar feature (Section 10, Data). */
export const calendarKeys = {
  all: ['calendar'],
  range: (filter = {}) => ['calendar', 'range', filter],
};
