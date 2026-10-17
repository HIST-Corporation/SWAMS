// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { PERMISSIONS, ROLES, ROLE_BUNDLES } from '@swams/permissions';
import { RolesMatrix } from './RolesMatrix.jsx';

const i18n = initI18n({ lng: 'en' });

describe('RolesMatrix', () => {
  it('renders one row per canonical permission, grouped by area', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <RolesMatrix />
      </I18nextProvider>,
    );

    const tables = screen.getAllByRole('table');
    const rows = screen.getAllByRole('row');
    // Header row per table plus one body row per permission.
    expect(rows.length).toBe(PERMISSIONS.length + tables.length);

    // Staff reality anchor: sees attendance, never settings.manage.
    const body = screen.getAllByRole('rowheader', { name: 'View attendance records' })[0];
    const row = body.closest('tr');
    const granted = within(row).getAllByText('Granted');
    expect(granted.length).toBeGreaterThan(0);
    for (const cell of granted) {
      expect(cell.closest('td')).toBeTruthy();
    }
    const settingsRow = screen.getAllByRole('rowheader', { name: 'Manage workspace settings' })[0];
    const denied = within(settingsRow.closest('tr')).getAllByText('Not granted');
    // Staff + manager deny settings.manage — the denial is at least visible.
    expect(denied.length).toBeGreaterThan(0);
  });

  it('covers every role column with a label, not an abbreviation', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <RolesMatrix />
      </I18nextProvider>,
    );

    for (const role of ['Staff', 'Team lead', 'Manager', 'HR', 'Owner', 'Super admin']) {
      expect(screen.getAllByRole('columnheader', { name: role }).length).toBeGreaterThan(0);
    }
    // One matrix per permission area, never a single wall of rows.
    expect(screen.getAllByRole('table').length).toBeGreaterThan(5);
    // Read-only honesty: no permission editing controls ship without the API.
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByText(/not published yet/i)).toBeInTheDocument();
  });

  it('keeps row and column headers wired so a screen reader can navigate it', () => {
    render(
      <I18nextProvider i18n={i18n}>
        <RolesMatrix />
      </I18nextProvider>,
    );

    const sample = screen.getAllByRole('rowheader', { name: 'View tasks' })[0].closest('tr');
    // Every role bundle except the platform-only super_admin holds tasks.read,
    // so those cells say exactly "Granted" ("Not granted" is excluded by the
    // exact match).
    const holders = ROLES.filter((role) => ROLE_BUNDLES[role].includes('tasks.read'));
    expect(holders).not.toContain('super_admin');
    expect(within(sample).getAllByText('Granted', { exact: true })).toHaveLength(holders.length);
    // The rowheader carries scope="row"; the same table's column headers carry
    // scope="col" with one labeled column per role.
    expect(sample.querySelector('th[scope="row"]')).toBeTruthy();
    const table = sample.closest('table');
    // Permission corner header plus one labeled column per role.
    expect(within(table).getAllByRole('columnheader')).toHaveLength(ROLES.length + 1);
    expect(table.querySelectorAll('th[scope="col"]')).toHaveLength(ROLES.length + 1);
    expect(within(table).getByRole('columnheader', { name: 'Permission' })).toBeTruthy();
  });
});
