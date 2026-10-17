// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';

import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { PunchHistoryRow } from './PunchHistoryRow.jsx';

let i18n;
beforeAll(() => {
  i18n = initI18n({ lng: 'en' });
});

const row = {
  id: 'att_1',
  date: '2026-10-09',
  clockIn: '09:02',
  clockOut: '17:18',
  workedMinutes: 486,
  status: 'present',
  exception: null,
};

const renderRow = (overrides = {}) =>
  render(
    <I18nextProvider i18n={i18n}>
      <ul>
        <PunchHistoryRow row={{ ...row, ...overrides }} />
      </ul>
    </I18nextProvider>,
  );

describe('PunchHistoryRow', () => {
  it('renders the day, times, duration and status', () => {
    renderRow();
    expect(screen.getByText('9 Oct 2026')).toBeTruthy();
    expect(screen.getByText('09:02')).toBeTruthy();
    expect(screen.getByText('17:18')).toBeTruthy();
    expect(screen.getByText('8h 06m')).toBeTruthy();
    // the status badge renders twice: once for the mobile record, once for the
    // md+ column (only one is visible per breakpoint)
    expect(screen.getAllByText('Present').length).toBeGreaterThanOrEqual(1);
  });

  it('labels each value so the mobile record is not "In09:02"', () => {
    renderRow();
    // the label and the value are separate elements with their own spacing
    const label = screen.getByText('In');
    expect(label.className).toContain('text-xs');
    expect(label.nextElementSibling.textContent).toBe('09:02');
  });

  it('shows an em dash for a day with no punches', () => {
    renderRow({ clockIn: null, clockOut: null, workedMinutes: 0, status: 'holiday' });
    expect(screen.getAllByText('Holiday').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('translates an exception into plain language', () => {
    renderRow({ status: 'late', exception: 'late_arrival' });
    expect(screen.getByText('Late arrival')).toBeTruthy();
  });

  it('renders in Nepali when the language is switched', async () => {
    const ne = initI18n();
    await ne.changeLanguage('ne');
    render(
      <I18nextProvider i18n={ne}>
        <ul>
          <PunchHistoryRow row={row} />
        </ul>
      </I18nextProvider>,
    );
    expect(screen.getAllByText('उपस्थित').length).toBeGreaterThanOrEqual(1);
    await ne.changeLanguage('en');
  });
});
