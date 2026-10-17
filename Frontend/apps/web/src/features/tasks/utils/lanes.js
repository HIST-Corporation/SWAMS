/**
 * Helpers for the board's configured columns (the five workflow lanes plus any
 * a manager added). A column's display name is the manager's `name` when set,
 * otherwise the i18n label (`tasks:lanes.*`), otherwise the raw id — a custom
 * column always carries a name, so the last fallback only guards bad data.
 */

/** The data type that marks a column-reorder drag (distinct from a card move). */
export const LANE_DRAG_TYPE = 'application/x-swams-lane';

const TONE_TEXT = {
  todo: 'text-text',
  in_progress: 'text-primary',
  review: 'text-violet-text',
  revision: 'text-danger-text',
  done: 'text-success-text',
};

/** Lane id → heading colour (§8.9: the word always sits next to the colour). */
export function laneToneText(id) {
  return TONE_TEXT[id] ?? 'text-text-muted';
}

/** Display label for a lane object. @param {Function} t */
export function labelOf(t, lane) {
  if (!lane) return '';
  if (lane.name) return lane.name;
  const key = `lanes.${lane.id}`;
  const text = t(key);
  return text === key ? String(lane.id) : text;
}

/** Lane id → lane object, falling back to a bare unconfigured column. */
export function toLane(id, lanes) {
  return lanes.find((lane) => lane.id === id) ?? { id, name: null, wipLimit: null };
}
