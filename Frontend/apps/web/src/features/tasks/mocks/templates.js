import { sessionContext } from './scope.js';

/**
 * Known board templates offered to every session. These are inspiration
 * presets, not user-owned records: they can be applied by managers/HR when
 * the board is reshaped.
 */
export const PRE_DEFINED_TEMPLATES = [
  {
    id: 'tmpl_blank',
    name: 'Blank board',
    description: 'Start from an empty board with the five standard workflow lanes.',
    lanes: [
      { id: 'todo', name: null, wipLimit: 4 },
      { id: 'in_progress', name: null, wipLimit: 3 },
      { id: 'review', name: null, wipLimit: 3 },
      { id: 'revision', name: null, wipLimit: null },
      { id: 'done', name: null, wipLimit: null },
    ],
  },
  {
    id: 'tmpl_it_support',
    name: 'IT Support',
    description: 'A typical helpdesk queue from incoming request to resolved.',
    lanes: [
      { id: 'todo', name: 'To do', wipLimit: 4 },
      { id: 'in_progress', name: 'In progress', wipLimit: 3 },
      { id: 'review', name: 'Review', wipLimit: 3 },
      { id: 'revision', name: 'Revision', wipLimit: null },
      { id: 'done', name: 'Done', wipLimit: null },
    ],
  },
  {
    id: 'tmpl_sales_pipeline',
    name: 'Sales Pipeline',
    description: 'Stage opportunities from lead to closed.',
    lanes: [
      { id: 'lead', name: 'Lead', wipLimit: 6 },
      { id: 'qualified', name: 'Qualified', wipLimit: 5 },
      { id: 'proposal', name: 'Proposal', wipLimit: 3 },
      { id: 'won', name: 'Closed won', wipLimit: null },
    ],
  },
  {
    id: 'tmpl_project_management',
    name: 'Project Management',
    description: 'Track project work through phases from backlog to done.',
    lanes: [
      { id: 'backlog', name: 'Backlog', wipLimit: null },
      { id: 'in_progress', name: 'In progress', wipLimit: 3 },
      { id: 'blocked', name: 'Blocked', wipLimit: 2 },
      { id: 'done', name: 'Done', wipLimit: null },
    ],
  },
  {
    id: 'tmpl_engineering_sprint',
    name: 'Engineering Sprint',
    description: 'Review sprint work before it moves into revision.',
    lanes: [
      { id: 'sprintBacklog', name: 'Sprint backlog', wipLimit: null },
      { id: 'in_progress', name: 'In progress', wipLimit: 4 },
      { id: 'review', name: 'Review', wipLimit: 3 },
      { id: 'done', name: 'Done', wipLimit: null },
    ],
  },
];

/** User-owned templates created from the current board (mock only). */
const CUSTOM_TEMPLATES = [];
const CUSTOM_PREFIX = 'tmpl_custom_';

/** Restore the custom template store (tests only). */
export function resetTemplates() {
  CUSTOM_TEMPLATES.length = 0;
}

/** Every template this session can see: presets plus this session's custom rows. */
export function listAllTemplates() {
  return [...PRE_DEFINED_TEMPLATES, ...CUSTOM_TEMPLATES];
}

/** Custom templates saved by the current session, newest first. */
export function listCustomTemplates() {
  return [...CUSTOM_TEMPLATES]
    .filter((template) => template.createdBy === sessionUserId())
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** The current session's id, when the auth mock has a session bound. */
function sessionUserId() {
  return sessionContext().id ?? null;
}

/** Look up a template by id across presets and the current session's custom rows. */
export function findTemplateById(id) {
  return listAllTemplates().find((template) => template.id === id) ?? null;
}

/**
 * Persist a template the current session chose from the active board.
 * Manager/HR is responsible for enforcing permissions before calling this.
 */
export function createCustomTemplate(input) {
  if (!input?.name?.trim()) {
    return { ok: false, code: 'invalid_name', message: 'Give the template a name.' };
  }
  const name = String(input.name).trim();
  const description = typeof input.description === 'string' ? String(input.description).trim() : '';
  const lanes = Array.isArray(input.lanes) ? input.lanes.map((lane) => ({ ...lane })) : [];

  const record = {
    id: `${CUSTOM_PREFIX}${CUSTOM_TEMPLATES.length + 1}`,
    name,
    description,
    lanes,
    createdBy: sessionUserId(),
    createdAt: Date.now(),
  };
  CUSTOM_TEMPLATES.push(record);
  return { ok: true, template: { ...record } };
}

/** Remove a custom template saved by the current session. */
export function removeCustomTemplate(id) {
  const index = CUSTOM_TEMPLATES.findIndex((template) => template.id === id);
  if (index === -1) return { ok: false, code: 'not_found', message: 'That template no longer exists.' };
  const [removed] = CUSTOM_TEMPLATES.splice(index, 1);
  return { ok: true, template: { ...removed } };
}
