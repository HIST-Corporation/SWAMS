import { nepalIso, nepalIsoDaysAgo } from '../utils/nepal.js';
import { byId, checklist, isoDaysAgo } from './seedHelpers.js';

/** One shortcut per roster person the fixture board assigns work to. */
const SITA = byId('u_sita');
const SARAH = byId('u_sarah');
const RAMESH = byId('u_ramesh');
const ANITA = byId('u_anita');
const PRIYA = byId('u_priya');
const JAMES = byId('u_james');
const TINA = byId('u_tina');
const PRAKASH = byId('u_prakash');
const SUNITA = byId('u_sunita');
const RAJ = byId('u_raj');
const AARATI = byId('u_aarati');

/**
 * The fixture board. Sixteen cards spread across all five lanes, eight of
 * them carrying a checklist (the board's "to-do list" inside a task), three
 * in Revision with the reviewer's note, so every state the UI can draw has
 * something real behind it. Two cards are due today — Home's "Due today" tile
 * and this board read the same store, so those two numbers always agree.
 */
export const SEED = [
  {
    id: 'tsk_01',
    title: 'Prepare the monthly payroll export',
    description: 'Finance needs the CSV before the 15th.',
    lane: 'todo',
    priority: 'high',
    assignee: ANITA,
    reviewer: null,
    due: nepalIso(),
    note: null,
    checklist: checklist('tsk_01', [
      ['Pull the October attendance summary', true],
      ['Apply the Dashain holiday rules', false],
      ['Send the file to Finance', false],
    ]),
  },
  {
    id: 'tsk_02',
    title: 'Draft the onboarding checklist for new hires',
    description: 'Cover laptop, accounts and the first-week plan.',
    lane: 'todo',
    priority: 'normal',
    assignee: SITA,
    reviewer: null,
    due: null,
    note: null,
    checklist: checklist('tsk_02', [
      ['Laptop and accounts', true],
      ['First-week plan', true],
      ['Buddy assignment', false],
      ['Day-one welcome note', false],
    ]),
  },
  {
    id: 'tsk_09',
    title: 'Plan the Dashain leave roster',
    description: 'Two people on call each public holiday.',
    lane: 'todo',
    priority: 'normal',
    assignee: PRAKASH,
    reviewer: null,
    due: nepalIsoDaysAgo(-6),
    note: null,
    checklist: checklist('tsk_09', [
      ['Collect everyone’s travel dates', false],
      ['Publish the on-call pairs', false],
    ]),
  },
  {
    id: 'tsk_14',
    title: 'Wire the offline punch queue states',
    description: 'Queue chip, retry banner and the 360px card layout.',
    lane: 'todo',
    priority: 'high',
    assignee: PRIYA,
    reviewer: RAMESH,
    due: null,
    note: null,
    checklist: checklist('tsk_14', [
      ['Queue chip on the punch card', true],
      ['Retry banner after reconnect', false],
    ]),
  },
  {
    id: 'tsk_03',
    title: 'Update the employee handbook for the new leave year',
    description: '',
    lane: 'in_progress',
    priority: 'normal',
    assignee: ANITA,
    reviewer: RAMESH,
    due: nepalIso(),
    note: null,
    checklist: checklist('tsk_03', [
      ['Draft the probation section', true],
      ['Update the festival holiday list', false],
      ['Ask legal to review the wording', false],
    ]),
  },
  {
    id: 'tsk_04',
    title: 'Reconcile the Baneshwor attendance exceptions',
    description: 'Two missed punches last Friday.',
    lane: 'in_progress',
    priority: 'high',
    assignee: RAMESH,
    reviewer: SITA,
    due: null,
    note: null,
    checklist: [],
  },
  {
    id: 'tsk_10',
    title: 'QA pass on the mobile punch flow',
    description: 'Offline queue, retry and the 360px layout.',
    lane: 'in_progress',
    priority: 'high',
    assignee: TINA,
    reviewer: PRIYA,
    due: nepalIsoDaysAgo(-3),
    note: null,
    checklist: checklist('tsk_10', [
      ['Airplane-mode punch queues', true],
      ['Sync after reconnect', false],
      ['Location-denied path', false],
      ['Folder-style 360px check', false],
    ]),
  },
  {
    id: 'tsk_11',
    title: 'Automate the monthly attendance report',
    description: 'The CSV is assembled by hand every month.',
    lane: 'review',
    priority: 'normal',
    assignee: JAMES,
    reviewer: RAJ,
    due: null,
    note: null,
    checklist: [],
  },
  {
    id: 'tsk_05',
    title: 'Review the Q3 hiring plan',
    description: 'Three roles proposed for Pokhara.',
    lane: 'review',
    priority: 'normal',
    assignee: SITA,
    reviewer: RAMESH,
    due: null,
    note: null,
    checklist: [],
  },
  {
    id: 'tsk_15',
    title: 'Card actions for the review lane',
    description: 'Start, send to review, approve and push back on every card.',
    lane: 'review',
    priority: 'normal',
    assignee: PRIYA,
    reviewer: ANITA,
    due: null,
    note: null,
    checklist: [],
  },
  {
    id: 'tsk_06',
    title: 'Fix the invoice numbering gaps',
    description: 'Invoices 1042–1045 are missing from the ledger.',
    lane: 'revision',
    priority: 'high',
    assignee: ANITA,
    reviewer: RAMESH,
    due: null,
    note: 'Please attach the ledger screenshot before this goes back to review.',
    checklist: [],
  },
  {
    id: 'tsk_12',
    title: 'Document the payroll import format',
    description: 'The vendor keeps asking for the column order.',
    lane: 'revision',
    priority: 'low',
    assignee: SUNITA,
    reviewer: SARAH,
    due: null,
    note: 'Add a worked example with the festival allowance column.',
    checklist: [],
  },
  {
    id: 'tsk_16',
    title: 'Clock-in button pressed states',
    description: 'Android Chrome misses the pressed token.',
    lane: 'revision',
    priority: 'normal',
    assignee: PRIYA,
    reviewer: ANITA,
    due: null,
    note: 'Use the pressed token from the design system.',
    checklist: [],
  },
  {
    id: 'tsk_07',
    title: 'Archive the 2081 festival bonus records',
    description: '',
    lane: 'done',
    priority: 'low',
    assignee: SITA,
    reviewer: null,
    due: null,
    note: null,
    // Already closed: the fixture board seeds the completed history too, so
    // the trail below the board has something real on first paint.
    closedAt: isoDaysAgo(2),
    checklist: checklist('tsk_07', [['Move the ledgers to the archive folder', true]]),
  },
  {
    id: 'tsk_08',
    title: 'Publish the revised work-from-home policy',
    description: 'Announce in #general after HR signs off.',
    lane: 'done',
    priority: 'normal',
    assignee: RAMESH,
    reviewer: SITA,
    due: null,
    note: null,
    checklist: [],
  },
  {
    id: 'tsk_13',
    title: 'Refresh the design-token contrast sheet',
    description: 'Both themes, every text/background pair.',
    lane: 'done',
    priority: 'normal',
    assignee: AARATI,
    reviewer: PRIYA,
    due: null,
    note: null,
    checklist: checklist('tsk_13', [
      ['Light theme pairs', true],
      ['Dark theme pairs', true],
    ]),
  },
].map((task) => ({ ...task, updatedAt: isoDaysAgo(task.lane === 'done' ? 3 : 0) }));
