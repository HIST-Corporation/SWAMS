import { describe, expect, it } from 'vitest';
import { initI18n } from '@swams/i18n';
import { buildOrgSnapshotCsv } from './orgSnapshot.js';
import { ORG_DASHBOARD } from '../mocks/fixtures.js';

const i18n = initI18n({ lng: 'en' });
const en = i18n.getFixedT('en', 'dashboard');

describe('buildOrgSnapshotCsv', () => {
  it('writes the figures the screen states, in the screen’s own units', () => {
    const csv = buildOrgSnapshotCsv(ORG_DASHBOARD, en, { asOf: ORG_DASHBOARD.asOf });

    expect(csv).toContain(`Company figures,${ORG_DASHBOARD.asOf}`);
    expect(csv).toContain('Present today,127');
    expect(csv).toContain('Attendance rate,89.4%');
    expect(csv).toContain('Total employees,142');
    expect(csv).toContain('Absent,7');

    // Departments keep the payload's order and precision.
    expect(csv).toContain('Engineering,96%');
    expect(csv).toContain('Finance,79%');

    // Benchmarks carry both columns and the verdict the table shows.
    expect(csv).toContain('Attendance rate,89%,85%,+4.4%');
    expect(csv).toContain('Overtime hours,8.4/wk,6.2/wk,High');
  });

  it('uses CRLF record endings so Excel and Sheets both open it', () => {
    const csv = buildOrgSnapshotCsv(ORG_DASHBOARD, en, { asOf: ORG_DASHBOARD.asOf });
    expect(csv.endsWith('\r\n')).toBe(true);
    expect(csv.split('\r\n').length).toBeGreaterThan(5);
  });

  it('quotes a value that carries a comma or a quote', () => {
    const csv = buildOrgSnapshotCsv(
      {
        kpi: { present: 1, rate: 100, headcount: 2, onLeave: 1, absent: 0 },
        departments: [{ id: 'd', name: 'Design, Brand', rate: 50 }],
      },
      en,
      { asOf: '2026-10-12' },
    );

    expect(csv).toContain('"Design, Brand",50%');
  });

  it('survives a half-loaded board without inventing a figure', () => {
    const csv = buildOrgSnapshotCsv(null, en, { asOf: '2026-10-12' });
    expect(csv).toContain('Present today,');
    expect(csv).not.toMatch(/Present today,-?\d/);
  });
});
