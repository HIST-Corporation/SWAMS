/**
 * Meetup poll fixtures (MOCK ONLY). Dates are Nepal-time sample slots; the
 * `GET /meetups` + `POST /meetups/:id/vote` contract is still open (screen
 * inventory R2). Nothing here is a real vote.
 */
export const POLL = {
  titleKey: 'pollTitle',
  closesKey: 'pollMeta',
  status: 'voting',
  options: [
    { id: 'fri', label: 'Fri, May 22 · 2:00 PM', votes: 5 },
    { id: 'sat', label: 'Sat, May 23 · 11:00 AM', votes: 3 },
    { id: 'sun', label: 'Sun, May 24 · 3:00 PM', votes: 0 },
  ],
};

export const PAST_MEETUPS = [
  { id: 'm_q1', eventKey: 'events.q1Lunch', date: 'Mar 15', attendees: 18, statusKey: 'done' },
  {
    id: 'm_hol',
    eventKey: 'events.holidayParty',
    date: 'Dec 20',
    attendees: 34,
    statusKey: 'done',
  },
];
