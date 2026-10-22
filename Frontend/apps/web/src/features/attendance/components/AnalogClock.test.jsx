// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { AnalogClock } from './AnalogClock.jsx';

const TEN_TWENTY_SIX = new Date('2026-10-12T04:41:00.000Z');
const THREE_FORTY_FIVE = new Date('2026-10-12T10:00:30.000Z');

function angleOf(container, index) {
  const hands = [...container.querySelectorAll('span.clock-hand[style]')];
  const transform = hands[index].getAttribute('style');
  const match = /rotate\(([-\d.]+)deg\)/.exec(transform);
  return Number(match[1]);
}

describe('AnalogClock', () => {
  it('renders a single valid div root with the dial drawn inside it', () => {
    const { container } = render(<AnalogClock time={TEN_TWENTY_SIX} />);
    const face = container.querySelector('div[role="img"]');
    expect(face).not.toBeNull();
    expect(container.querySelectorAll('span').length).toBeGreaterThan(0);
  });

  it('draws four cardinal numerals around the dial', () => {
    const { container } = render(<AnalogClock time={TEN_TWENTY_SIX} />);
    const numerals = [...container.querySelectorAll('span')]
      .filter((s) => s.textContent && /^(XII|III|VI|IX)$/.test(s.textContent.trim()))
      .map((n) => n.textContent);
    expect(numerals).toEqual(['XII', 'III', 'VI', 'IX']);
  });

  it('points the hands at the Nepal wall-clock time', () => {
    const { container } = render(<AnalogClock time={TEN_TWENTY_SIX} />);
    expect(angleOf(container, 0)).toBeCloseTo(10 * 30 + 26 * 0.5, 5);
    expect(angleOf(container, 1)).toBeCloseTo(26 * 6, 5);
    expect(angleOf(container, 2)).toBeCloseTo(0, 5);
  });

  it('moves the second hand with the seconds', () => {
    const { container } = render(<AnalogClock time={THREE_FORTY_FIVE} />);
    expect(angleOf(container, 0)).toBeCloseTo((15 % 12) * 30 + 45 * 0.5 + 30 / 120, 5);
    expect(angleOf(container, 1)).toBeCloseTo(45 * 6 + 30 * 0.1, 5);
    expect(angleOf(container, 2)).toBeCloseTo(180, 5);
  });

  it('preserves the label and sublabel props for API compatibility', () => {
    const { container } = render(
      <AnalogClock time={TEN_TWENTY_SIX} label="10:26" sublabel="General 09:00–17:30" />,
    );
    expect(container.querySelector('div[role="img"]')).not.toBeNull();
  });

  it('exposes the dial as an image with the clock time as its accessible label', () => {
    const { container } = render(<AnalogClock time={TEN_TWENTY_SIX} />);
    const face = container.querySelector('div[role="img"]');
    expect(face.getAttribute('role')).toBe('img');
    expect(face.getAttribute('aria-label')).toBe('10:26 AM');
  });

  it('omits the second hand when showSeconds is false', () => {
    const { container } = render(<AnalogClock time={TEN_TWENTY_SIX} showSeconds={false} />);
    const hands = container.querySelectorAll('span.clock-hand');
    expect(hands).toHaveLength(2);
  });
});
