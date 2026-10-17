import { codeStyle, labelStyle, panelStyle, tokens } from './tokens.js';

export default { title: 'Foundations/Typography', parameters: { layout: 'padded' } };

const SAMPLE_LATIN =
  'Attendance, tasks, leave and messages for Himal Digital — 31h 40m worked, 2h overtime.';
const SAMPLE_NEPALI =
  'हिमल डिजिटलका लागि उपस्थिति, कार्य, बिदा र सन्देश — यस हप्ता ३१ घण्टा ४० मिनेट।';

/** One family for Latin and Devanagari, rendered across the whole scale (Section 8.2). */
export const Scale = {
  render: () => (
    <div style={panelStyle}>
      <p style={{ ...labelStyle, color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
        Mukta — Latin and Devanagari at every step of the scale (12 → 48).{' '}
        <span style={codeStyle}>{tokens.type.family.ui}</span>
      </p>
      {Object.entries(tokens.type.size).map(([name, px]) => (
        <div key={name} style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ ...codeStyle }}>
            {name} · {px}px
          </div>
          <div
            style={{
              fontSize: `var(--font-size-${name})`,
              lineHeight: 'var(--line-height-heading)',
            }}
          >
            {SAMPLE_LATIN}
          </div>
          <div
            lang="ne"
            style={{
              fontSize: `var(--font-size-${name})`,
              lineHeight: 'var(--line-height-devanagari)',
              color: 'var(--text-muted)',
            }}
          >
            {SAMPLE_NEPALI}
          </div>
        </div>
      ))}
    </div>
  ),
};

export const LineHeights = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: '70ch' }}>
      <div style={panelStyle}>
        <div style={codeStyle}>body 1.5</div>
        <p style={{ lineHeight: 'var(--line-height-body)', margin: 0 }}>{SAMPLE_LATIN}</p>
      </div>
      <div style={panelStyle}>
        <div style={codeStyle}>devanagari 1.6</div>
        <p lang="ne" style={{ lineHeight: 'var(--line-height-devanagari)', margin: 0 }}>
          {SAMPLE_NEPALI}
        </p>
      </div>
      <div style={panelStyle}>
        <div style={codeStyle}>heading 1.2</div>
        <p
          style={{
            fontSize: 'var(--font-size-xl)',
            lineHeight: 'var(--line-height-heading)',
            margin: 0,
          }}
        >
          Good morning, Sita
        </p>
      </div>
    </div>
  ),
};

export const TabularNumerals = {
  render: () => (
    <div style={panelStyle}>
      <p style={{ ...labelStyle, color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
        Time, money and tables use tabular numerals (Section 8.2).
      </p>
      <table
        className="tabular"
        style={{ borderCollapse: 'collapse', fontSize: 'var(--font-size-base)' }}
      >
        <tbody>
          {[
            ['Today', '09:02 – 17:30', 'रू 1,25,000'],
            ['Yesterday', '08:57 – 17:04', 'रू 1,25,000'],
            ['This week', '31h 40m', 'रू 4,50,000'],
          ].map(([when, time, amount]) => (
            <tr key={when}>
              <td
                style={{
                  padding: 'var(--space-2) var(--space-6) var(--space-2) 0',
                  color: 'var(--text-muted)',
                }}
              >
                {when}
              </td>
              <td style={{ padding: 'var(--space-2) var(--space-6) var(--space-2) 0' }}>{time}</td>
              <td style={{ padding: 'var(--space-2) 0' }}>{amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
};
