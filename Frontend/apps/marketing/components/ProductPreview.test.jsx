// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '@swams/i18n';
import { ProductPreview } from './ProductPreview.jsx';

let i18n;
beforeAll(async () => {
  i18n = initI18n({ lng: 'en' });
  await i18n.changeLanguage('en');
});

const renderPreview = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <ProductPreview />
    </I18nextProvider>,
  );

describe('ProductPreview', () => {
  it('shows the manager morning screen with sample data, never the live product', () => {
    renderPreview();

    // The preview window names itself and shows the KPIs.
    expect(screen.getByLabelText(/swams workspace preview/i)).toBeTruthy();
    expect(screen.getByText(/present today/i)).toBeTruthy();
    expect(screen.getByText(/today's board/i)).toBeTruthy();
    // The kanban lanes and a sample card render (sample data, §12.1).
    expect(screen.getAllByText(/^to do$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/review payroll export/i)).toBeTruthy();
    // The live presence badge and the sample-data disclaimer are both present.
    expect(screen.getByText(/^live$/i)).toBeTruthy();
    expect(screen.getByText(/sample workspace/i)).toBeTruthy();
  });

  it('leaves no clock-in control behind', () => {
    renderPreview();

    // The old clock-in demo is gone — no clock-in control remains.
    expect(screen.queryByRole('button', { name: /^clock in$/i })).toBeNull();
  });
});
