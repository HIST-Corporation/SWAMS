/** Query-key factory for the tasks feature (Section 10, Data). */
export const taskKeys = {
  all: ['tasks'],
  board: () => ['tasks', 'board'],
  templates: () => ['tasks', 'templates'],
};
