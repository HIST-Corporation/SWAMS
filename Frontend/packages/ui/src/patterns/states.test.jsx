// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Avatar,
  Badge,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  Skeleton,
  StatTile,
} from '../index.js';
import { initI18n } from '@swams/i18n';

initI18n();

describe('EmptyState', () => {
  it('renders title, body and action', () => {
    render(
      <EmptyState
        title="No requests yet"
        body="They appear here."
        action={<button type="button">Request leave</button>}
      />,
    );
    expect(screen.getByText('No requests yet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Request leave' })).toBeTruthy();
  });
});

describe('ErrorState', () => {
  it('keeps the request ID collapsed until Details is expanded', () => {
    render(<ErrorState message="Service timeout." requestId="req_9f2c81" />);
    expect(screen.getByRole('alert')).toBeTruthy();
    const details = screen.getByText('Details').closest('details');
    // Collapsed <details> content stays in the DOM but is not shown/announced.
    expect(details).not.toHaveAttribute('open');
    expect(screen.queryByText(/Request ID/).closest('details')).toBe(details);
  });
});

describe('StatTile', () => {
  it('renders label, tabular value and hint', () => {
    render(<StatTile label="This week" value="31h 40m" hint="+2h OT" tone="primary" />);
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('31h 40m')).toBeTruthy();
    expect(screen.getByText('+2h OT')).toBeTruthy();
  });

  it('renders a decorative icon chip that assistive tech ignores', () => {
    const { container } = render(
      <StatTile label="On site" value="12" tone="success" icon={<span data-testid="glyph" />} />,
    );
    expect(screen.getByText('On site')).toBeTruthy();
    expect(screen.getByTestId('glyph')).toBeTruthy();
    // The icon wrapper is aria-hidden: the label carries the meaning.
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});

describe('FormField', () => {
  it('wires label, hint and error to the control for screen readers', () => {
    render(
      <FormField label="Work email" error="That email is already in use.">
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} invalid={invalid} />
        )}
      </FormField>,
    );
    const input = screen.getByLabelText(/Work email/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveTextContent('That email is already in use.');
  });

  it('marks optional fields without an asterisk', () => {
    render(<FormField label="Note">{() => <Input aria-label="Note" />}</FormField>);
    expect(screen.getByText('(optional)')).toBeTruthy();
  });
});

describe('Display primitives', () => {
  it('Badge renders its tone content', () => {
    render(<Badge tone="success">Approved</Badge>);
    expect(screen.getByText('Approved')).toBeTruthy();
  });

  it('Avatar shows initials and an accessible name', () => {
    render(<Avatar name="Sita Shrestha" hue="teal" />);
    const avatar = screen.getByRole('img', { name: 'Sita Shrestha' });
    expect(avatar).toHaveTextContent('SS');
  });

  it('Skeleton is hidden from assistive tech', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild.getAttribute('aria-hidden')).toBe('true');
  });
});
