// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { BoardColumns } from './BoardColumns.jsx';

const i18n = initI18n({ lng: 'en' });

const LANES = [
  { id: 'todo', name: null, wipLimit: null },
  { id: 'in_progress', name: null, wipLimit: null },
  { id: 'review', name: null, wipLimit: null },
  { id: 'done', name: null, wipLimit: null },
];

/**
 * jsdom has no DataTransfer. This stand-in records `setData` into `types` (so
 * `isLaneDrag` sees the lane-reorder marker during dragover, as a real browser
 * does) and serves it back on `getData` at drop time.
 */
const makeDataTransfer = () => {
  const store = new Map();
  return {
    effectAllowed: 'uninitialized',
    dropEffect: 'none',
    types: [],
    setData(type, value) {
      if (!store.has(type)) this.types.push(type);
      store.set(type, String(value));
    },
    getData(type) {
      return store.has(type) ? store.get(type) : '';
    },
  };
};

const renderColumns = ({ canManage = true, onMove = vi.fn(), onDeleteLane = vi.fn(), lanes = LANES } = {}) => {
  const cardDrop = vi.fn();
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <BoardColumns
        board={{ canManage, rows: [], isLoading: false, error: null, refetch: vi.fn() }}
        lanes={lanes}
        dropValidFor={() => true}
        onOpenTask={vi.fn()}
        onGripKeyDown={vi.fn()}
        onLift={vi.fn()}
        onDrop={cardDrop}
        onDragOver={vi.fn()}
        onQuickAdd={vi.fn()}
        onReorderLane={onMove}
        onDeleteLane={onDeleteLane}
      />
    </I18nextProvider>,
  );
  return { ...utils, onMove, onDeleteLane, cardDrop };
};

const gripFor = (lane) => screen.getByRole('button', { name: new RegExp(`Move the ${lane} column`, 'i') });
const laneSection = (id) => document.querySelector(`[data-lane="${id}"]`);
// The draggable title band — the real drag source now (grab anywhere on the header).
const laneHandle = (id) => document.querySelector(`[data-lane-handle="${id}"]`);

describe('BoardColumns — responsive strip', () => {
  it('lays every column out in one horizontal strip that scrolls, not a wrapping grid', () => {
    const { container } = renderColumns();
    const strip = container.querySelector('.overflow-x-auto');
    expect(strip).not.toBeNull();
    // Columns keep one readable width and never squeeze: the strip scrolls
    // sideways when five-plus lanes don't share the screen.
    for (const lane of LANES) {
      expect(laneSection(lane.id).className).toContain('w-64');
      expect(laneSection(lane.id).className).toContain('shrink-0');
    }
    // No legacy wrapping-grid classes remain.
    expect(container.querySelector('.grid-cols-1')).toBeNull();
    // Columns are content-height: `items-start` (not the default `stretch`) so a
    // short column never stretches to match the tallest (§7.6).
    expect(strip.className).toContain('items-start');
  });
});

describe('BoardColumns — column reorder', () => {
  it('shows a grip and a header delete only for the manager/HR view', () => {
    const managed = renderColumns({ canManage: true });
    expect(gripFor('To do')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete To do/i })).toBeInTheDocument();
    managed.unmount();

    renderColumns({ canManage: false });
    expect(screen.queryByRole('button', { name: /Move the .* column/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete To do/i })).not.toBeInTheDocument();
  });

  it('reorders a column when its header band is dragged onto another column', () => {
    const { onMove } = renderColumns();
    const dataTransfer = makeDataTransfer();

    // Drag the To do header band (grab anywhere on it) onto the Done column.
    fireEvent.dragStart(laneHandle('todo'), { dataTransfer });
    fireEvent.dragOver(laneSection('done'), { dataTransfer });
    fireEvent.drop(laneSection('done'), { dataTransfer });

    // Done is index 3; the server receives the moved id and the target index.
    expect(onMove).toHaveBeenCalledWith('todo', 3);
  });

  it('starts a drag from anywhere on the header band, but not from + or delete', () => {
    const { onMove } = renderColumns();
    const dataTransfer = makeDataTransfer();

    // The band is draggable; grabbing it (not just the grip) begins a reorder.
    fireEvent.dragStart(laneHandle('todo'), { dataTransfer });
    fireEvent.drop(laneSection('review'), { dataTransfer });
    expect(onMove).toHaveBeenCalledWith('todo', 2);

    onMove.mockClear();

    // + and delete live OUTSIDE the band, so a drag begun on them never reorders.
    const band = laneHandle('todo');
    const plus = laneSection('todo').querySelector('button[aria-label="Add a task to To do"]');
    const del = laneSection('todo').querySelector('button[aria-label="Delete To do"]');
    expect(plus).not.toBeNull();
    expect(del).not.toBeNull();
    expect(band.contains(plus)).toBe(false);
    expect(band.contains(del)).toBe(false);
    // The grip, by contrast, stays inside the band as its keyboard affordance.
    expect(band.contains(gripFor('To do'))).toBe(true);
  });

  it('ignores a drop back onto the same column', () => {
    const { onMove } = renderColumns();
    const dataTransfer = makeDataTransfer();

    fireEvent.dragStart(gripFor('review'), { dataTransfer });
    fireEvent.drop(laneSection('review'), { dataTransfer });

    expect(onMove).not.toHaveBeenCalled();
  });

  it('reorders a column with the arrow keys on its grip (no drag required)', () => {
    const { onMove } = renderColumns();
    // To do is index 0; ArrowRight moves it to index 1.
    fireEvent.keyDown(gripFor('To do'), { key: 'ArrowRight' });
    expect(onMove).toHaveBeenCalledWith('todo', 1);

    // In progress is index 1; ArrowLeft moves it to index 0.
    fireEvent.keyDown(gripFor('In progress'), { key: 'ArrowLeft' });
    expect(onMove).toHaveBeenCalledWith('in_progress', 0);
  });

  it('does not move a column past either end of the board', () => {
    const { onMove } = renderColumns();
    fireEvent.keyDown(gripFor('To do'), { key: 'ArrowLeft' }); // already first
    fireEvent.keyDown(gripFor('Done'), { key: 'ArrowRight' }); // already last
    expect(onMove).not.toHaveBeenCalled();
  });

  it('opens the delete confirm from the column header', () => {
    const { onDeleteLane } = renderColumns();
    fireEvent.click(screen.getByRole('button', { name: /Delete In progress/i }));
    expect(onDeleteLane).toHaveBeenCalledWith(expect.objectContaining({ id: 'in_progress' }));
  });

  it('keeps a column-reorder drag from being read as a card move', () => {
    const { onMove, cardDrop } = renderColumns();
    // The card-move handler is the BoardColumns `onDrop` prop; a lane drag must
    // never reach it, only the reorder machine.
    const dataTransfer = makeDataTransfer();
    fireEvent.dragStart(gripFor('To do'), { dataTransfer });
    fireEvent.drop(laneSection('done'), { dataTransfer });
    expect(onMove).toHaveBeenCalledWith('todo', 3);
    expect(cardDrop).not.toHaveBeenCalled();
  });
});
