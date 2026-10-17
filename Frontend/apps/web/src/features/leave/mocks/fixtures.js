/**
 * Leave fixtures (MOCK ONLY). Himal Digital Pvt. Ltd. — the same people ids as
 * the attendance and team fixtures so three screens never disagree about who
 * exists (§8.8). Never presented as production data.
 */

/** Balance for the signed-in staff fixture (Anita Thapa). */
export const LEAVE_BALANCE = {
  rows: [
    { type: 'annual', entitled: 15, used: 2, pending: 1, remaining: 12 },
    { type: 'sick', entitled: 10, used: 0, pending: 0, remaining: 10 },
  ],
};

/** The signed-in person's own requests — one pending, one approved. */
export const REQUESTS_MINE = {
  rows: [
    {
      id: 'lv_1',
      type: 'annual',
      start: '2026-10-20',
      end: '2026-10-22',
      days: 3,
      status: 'pending',
      note: 'Dashain travel to Pokhara.',
      submittedAt: '2026-10-06',
    },
    {
      id: 'lv_2',
      type: 'sick',
      start: '2026-09-14',
      end: '2026-09-14',
      days: 1,
      status: 'approved',
      note: null,
      decidedBy: 'u_sita',
      submittedAt: '2026-09-14',
    },
  ],
};

/** The reviewer bench (manager/HR lens) — two people waiting on a decision. */
export const REQUESTS_PENDING = {
  rows: [
    {
      id: 'lv_3',
      employee: { id: 'u_prakash', name: 'Prakash Gurung' },
      type: 'annual',
      start: '2026-10-27',
      end: '2026-10-29',
      days: 3,
      status: 'pending',
      note: 'Family function in Chitwan.',
      submittedAt: '2026-10-08',
    },
    {
      id: 'lv_4',
      employee: { id: 'u_sunita', name: 'Sunita Rai' },
      type: 'sick',
      start: '2026-10-11',
      end: '2026-10-11',
      days: 1,
      status: 'pending',
      note: null,
      submittedAt: '2026-10-09',
    },
  ],
};

/** Org holidays — real Nepali festivals from the §8.8 sample set. */
export const HOLIDAYS = {
  rows: [
    { date: '2026-10-20', name: 'Dashain begins' },
    { date: '2026-10-24', name: 'Vijaya Dashami' },
    { date: '2026-11-09', name: 'Tihar begins' },
    { date: '2026-11-12', name: 'Bhai Tika' },
  ],
};
