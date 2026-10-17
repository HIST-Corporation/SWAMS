import { nepalIsoDaysAgo } from '../utils/nepal.js';

/**
 * The revision history trail (the prototype's `REVISION HISTORY TRAIL`). Every
 * push back appends a row through the store; these three seed the trail so the
 * table has something real to show. `issue` mirrors the card's note,
 * `reviewer` is who pushed back, `date` is a Nepal calendar day. Newest first.
 */
/**
 * The revision history trail (the prototype's `REVISION HISTORY TRIAL`). Every
 * push back appends a row here through the store; these three seed the trail
 * so the table has something real to show. `issue` mirrors the card's note,
 * `reviewer` is who pushed back, `date` is a Nepal calendar day.
 * Newest first.
 */
export const SEED_REVISIONS = [
  {
    id: 'rev_01',
    taskId: 'tsk_06',
    taskTitle: 'Fix the invoice numbering gaps',
    issue: 'Please attach the ledger screenshot before this goes back to review.',
    suggestion: 'Export the ledger sheet as an image and attach it to the task.',
    severity: 'major',
    reviewer: 'Ramesh Adhikari',
    date: nepalIsoDaysAgo(1),
  },
  {
    id: 'rev_02',
    taskId: 'tsk_16',
    taskTitle: 'Clock-in button pressed states',
    issue: 'Use the pressed token from the design system.',
    suggestion: 'Map the active state to the primary-strong token instead of a hardcoded grey.',
    severity: 'minor',
    reviewer: 'Anita Thapa',
    date: nepalIsoDaysAgo(1),
  },
  {
    id: 'rev_03',
    taskId: 'tsk_12',
    taskTitle: 'Document the payroll import format',
    issue: 'Add a worked example with the festival allowance column.',
    suggestion: 'One CSV snippet plus the rows it produces is enough.',
    severity: 'minor',
    reviewer: 'Sarah Mitchell',
    date: nepalIsoDaysAgo(2),
  },
];
