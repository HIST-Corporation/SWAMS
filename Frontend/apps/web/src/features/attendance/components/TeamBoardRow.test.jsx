// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { TeamBoardRow } from './TeamBoardRow.jsx';

const ROW = {
  id: 'u_prakash',
  name: 'Prakash Gurung',
  site: 'Pokhara',
  presence: 'late',
  clockIn: '09:46',
  workedMinutes: 442,
  exception: 'late_arrival',
};

function renderRow(row = ROW, lng = 'en') {
  const i18n = initI18n({ lng });
  return render(
    <I18nextProvider i18n={i18n}>
      <ul>
        <TeamBoardRow row={row} />
      </ul>
    </I18nextProvider>,
  );
}

describe('TeamBoardRow', () => {
  it('names the person, site, and presence in words — never colour alone', () => {
    renderRow();
    expect(screen.getByText('Prakash Gurung')).toBeInTheDocument();
    expect(screen.getByText('Pokhara')).toBeInTheDocument();
    expect(screen.getByText('Late')).toBeInTheDocument();
    expect(screen.getByText('09:46')).toBeInTheDocument();
  });

  it('renders a dash for a day with no punches yet', () => {
    renderRow({ ...ROW, presence: 'out', clockIn: null, workedMinutes: 0 });
    expect(screen.getByText('Not in yet')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders the presence word in Nepali', async () => {
    // initI18n is a singleton — switch its language like the feature's own
    // Nepali tests do, and switch straight back afterwards.
    const i18n = initI18n();
    await i18n.changeLanguage('ne');
    render(
      <I18nextProvider i18n={i18n}>
        <ul>
          <TeamBoardRow row={ROW} />
        </ul>
      </I18nextProvider>,
    );
    expect(screen.getAllByText('ढिलो').length).toBeGreaterThanOrEqual(1);
    await i18n.changeLanguage('en');
  });
});
