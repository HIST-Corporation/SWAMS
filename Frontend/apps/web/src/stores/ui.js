import { create } from 'zustand';

/**
 * Cross-screen UI state (Section 5, state ownership table) — server data never
 * lives here.
 */
export const useUiStore = create((set) => ({
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: Boolean(open) }),
  togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),
}));
