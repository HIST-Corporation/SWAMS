import { create } from 'zustand';

/**
 * Availability store (client state, Section 5) — your presence status, shown
 * to teammates in Team now / Messages / video calls. Persisted in
 * localStorage like the theme preference; the mock server has no presence
 * endpoint, so nothing here is presented as server state (§12.1, honest UI).
 */

/** Availability values the UI speaks in words (never colour alone, §8.9).
 * `do_not_disturb` is the "I'm reachable but not now" state: the bell and the
 * message composer react to it so nobody is poked mid-focus. */
export const AVAILABILITY = ['online', 'busy', 'away', 'do_not_disturb', 'offline'];

/** Storage key shared by dashboard, messages and video call lenses. */
export const PRESENCE_STORAGE_KEY = 'swams.presence';

/**
 * The custom status line's own key. Availability stays a bare string under
 * `PRESENCE_STORAGE_KEY`, so a session that stored only a status (no message)
 * still loads — the two are independent.
 */
export const MESSAGE_STORAGE_KEY = 'swams.presence.message';

/**
 * The preset status messages the sidebar offers — a picklist, not free text,
 * so the line reads as a deliberate signal a teammate can scan (Slack/Teams
 * style) rather than a sentence. The component maps `id` → icon and
 * `id` → label (`nav.statusMessage.presets.*`); the store only ever holds one
 * of these ids, or `''` for "no status set".
 */
export const STATUS_PRESETS = [
  'available',
  'deep_work',
  'in_a_meeting',
  'on_break',
  'focusing',
  'on_leave',
];

function readStored() {
  try {
    const stored = window.localStorage.getItem(PRESENCE_STORAGE_KEY);
    return AVAILABILITY.includes(stored) ? stored : 'online';
  } catch {
    return 'online';
  }
}

function store(status) {
  try {
    window.localStorage.setItem(PRESENCE_STORAGE_KEY, status);
  } catch {
    /* private mode: in-memory only */
  }
}

/** The chosen preset's id — empty means "not set". Anything else loads as blank. */
function readMessage() {
  try {
    const stored = window.localStorage.getItem(MESSAGE_STORAGE_KEY) ?? '';
    return STATUS_PRESETS.includes(stored) ? stored : '';
  } catch {
    return '';
  }
}

function storeMessage(message) {
  try {
    window.localStorage.setItem(MESSAGE_STORAGE_KEY, message);
  } catch {
    /* private mode: in-memory only */
  }
}

export const usePresenceStore = create((set) => ({
  status: typeof window === 'undefined' ? 'online' : readStored(),
  /** Chosen preset status id shown beside your name; empty until you set one. */
  statusMessage: typeof window === 'undefined' ? '' : readMessage(),
  setStatus: (status) =>
    set(() => {
      const next = AVAILABILITY.includes(status) ? status : 'online';
      store(next);
      return { status: next };
    }),
  setStatusMessage: (id) =>
    set(() => {
      // Only a known preset id (or '' to clear) is accepted — the line is a
      // picklist, never free text, so a stray value can't corrupt the display.
      const next = id === '' || STATUS_PRESETS.includes(id) ? id : '';
      storeMessage(next);
      return { statusMessage: next };
    }),
}));
