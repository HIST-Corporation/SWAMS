// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stepper } from './Stepper.jsx';

describe('Stepper', () => {
  it('renders all steps with 1-indexed numbers', () => {
    render(<Stepper steps={['One', 'Two', 'Three']} current={1} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('1.');
  });

  it('marks the current step with aria-current (Section 8.9)', () => {
    render(<Stepper steps={['One', 'Two', 'Three']} current={2} />);
    const items = screen.getAllByRole('listitem');
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[0]).not.toHaveAttribute('aria-current');
  });

  it('supports the list label for accessibility', () => {
    render(<Stepper steps={['One']} current={1} aria-label="Wizard progress" />);
    expect(screen.getByRole('list', { name: 'Wizard progress' })).toBeTruthy();
  });
});
