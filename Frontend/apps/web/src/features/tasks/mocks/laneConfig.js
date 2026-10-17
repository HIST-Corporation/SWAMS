import { SEED_LANES } from './seeds.js';

/**
 * Mutable board column configuration for the mock (\"slots\"). MO ONLY — the
 * real API stores this per org. The five workflow lanes always exist; a
 * manager (role ≠ staff) may append columns and rename or WIP-limit any of
 * them through `POST/PATCH /tasks/lanes`. The rules that gate a write live
 * here, never in a component (§7.6).
 */

const MAX_NAME = 40;
const clone = (lane) => ({ ...lane });
const fail = (code, message) => ({ ok: false, code, message });

const lanes = SEED_LANES.map(clone);

/** Restore the fixture column set (tests only). */
export function resetLaneConfig() {
  lanes.length = 0;
  lanes.push(...SEED_LANES.map(clone));
}

/** Every column, in board order. */
export function listLanes() {
  return lanes.map(clone);
}

/** Every column id, built-in and custom — what a lane move is checked against. */
export function laneIds() {
  return lanes.map((lane) => lane.id);
}

function validateName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return fail('invalid_name', 'Give the column a name.');
  if (trimmed.length > MAX_NAME) {
    return fail('invalid_name', `Keep the column name under ${MAX_NAME} characters.`);
  }
  if (lanes.some((lane) => lane.name && lane.name.toLowerCase() === trimmed.toLowerCase())) {
    return fail('lane_exists', 'A column with that name already exists.');
  }
  return { ok: true, name: trimmed };
}

/** A WIP limit is `null` (none) or a whole number 1–99; never zero. */
function validateWip(value) {
  if (value === null) return { ok: true, wipLimit: null };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    return fail('invalid_wip', 'The WIP limit must be a whole number from 1 to 99.');
  }
  return { ok: true, wipLimit: n };
}

/** Append a manager-defined column at the end of the board. */
export function addLane({ name, wipLimit } = {}) {
  const checkedName = validateName(name);
  if (!checkedName.ok) return checkedName;
  const checkedWip =
    wipLimit === undefined || wipLimit === null
      ? { ok: true, wipLimit: null }
      : validateWip(wipLimit);
  if (!checkedWip.ok) return checkedWip;

  const record = {
    id: `col_${Math.random().toString(36).slice(2, 8)}`,
    name: checkedName.name,
    wipLimit: checkedWip.wipLimit,
  };
  lanes.push(record);
  return { ok: true, record: { ...record } };
}

/**
 * Rename a column (a blank name restores the standard label on a built-in
 * lane) and/or set its WIP limit. Ids are immutable.
 */
export function updateLane(id, patch) {
  const lane = lanes.find((row) => row.id === id);
  if (!lane) return fail('lane_not_found', 'That column no longer exists.');

  const names = ['name', 'wipLimit', 'index'].filter((key) => key in patch);
  if (names.length === 0) return fail('invalid_patch', 'That request changes nothing.');

  if ('name' in patch) {
    const trimmed = String(patch.name ?? '').trim();
    if (trimmed) {
      const checked = validateName(trimmed);
      if (!checked.ok) return checked;
      lane.name = checked.name;
    } else {
      lane.name = null; // blank restores the standard i18n label
    }
  }
  if ('index' in patch) {
    const current = lanes.indexOf(lane);
    const next = Math.min(Math.max(patch.index, 0), lanes.length);
    if (next !== current) {
      lanes.splice(current, 1);
      lanes.splice(next, 0, lane);
    }
  }
  if ('wipLimit' in patch) {
    const checked = validateWip(patch.wipLimit);
    if (!checked.ok) return checked;
    lane.wipLimit = checked.wipLimit;
  }
  return { ok: true, record: { ...lane } };
}

/** Delete a column. Its tasks stay put and are readded to the first remaining
 * lane so nothing is lost. */
export function deleteLane(id) {
  const lane = lanes.find((row) => row.id === id);
  if (!lane) return fail('lane_not_found', 'That column no longer exists.');
  lanes.splice(lanes.indexOf(lane), 1);
  return { ok: true };
}
/**
 * Replace the current board columns (template application only).
/**
 * Replace the current board columns (template application only).
 */
export function setLanes(next) {
  lanes.length = 0;
  lanes.push(...next.map(clone));
}
