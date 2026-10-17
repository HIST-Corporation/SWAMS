import { CommandPalette } from '../../src/index.js';

const GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'attendance', label: 'Attendance' },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    items: [
      { id: 'tasks', label: 'Task board' },
      { id: 'leave', label: 'Leave & requests' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    items: [{ id: 'team', label: 'Team' }],
  },
];

export default {
  title: 'Patterns/CommandPalette',
  component: CommandPalette,
  parameters: { layout: 'centered' },
};

/** Open by default; keyboard: type to filter, arrows to move, Enter selects. */
export const Open = {
  args: {
    open: true,
    onOpenChange: () => {},
    onSelect: () => {},
    groups: GROUPS,
    title: 'Search',
    placeholder: 'Search sections…',
    emptyLabel: 'No matches',
    hintLabel: 'Type to filter, Enter to open',
  },
};

export const NoMatches = {
  args: {
    ...Open.args,
    initialQuery: 'zzz',
  },
};
