/**
 * AnalogClock: minimalist CSS/DOM clock face.
 * Four cardinal numerals (XII, III, VI, IX), eight tick marks,
 * bar hands pivoting at bottom center, center pin.
 * No day/month/date — just the time.
 * Colours from SWAMS design tokens for automatic dark/light mode.
 */
import { useEffect, useMemo, useState } from 'react';
import { formatClock, nepalParts } from '@swams/i18n';

const CARDINAL = [
  { num: 'XII', deg: 0 },
  { num: 'III', deg: 90 },
  { num: 'VI', deg: 180 },
  { num: 'IX', deg: 270 },
];

const TICK_DEGS = [30, 60, 120, 150, 210, 240, 300, 330];

export function AnalogClock({ time, size = 170, _label, _sublabel, showSeconds = true }) {
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const now = useMemo(() => time ?? new Date(tick), [time, tick]);
  const { hours, minutes, seconds } = nepalParts(now);

  const hourDeg = ((hours % 12) + minutes / 60 + seconds / 3600) * 30;
  const minuteDeg = (minutes + seconds / 60) * 6;
  const secondDeg = seconds * 6;

  const numeralR = size * 0.38;
  const tickR = size * 0.4;

  const handLen = {
    hour: size * 0.22,
    minute: size * 0.32,
    second: size * 0.38,
  };
  const handWid = {
    hour: size * 0.035,
    minute: size * 0.02,
    second: size * 0.012,
  };

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div
        role="img"
        aria-label={formatClock(now, { hour12: true })}
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.4) inset',
          position: 'relative',
        }}
      >
        {/* Cardinal numerals */}
        {CARDINAL.map(({ num, deg }) => (
          <span
            key={num}
            className="clock-numeral"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '1ch',
              height: '1ch',
              transform: `rotate(${deg}deg) translateY(-${numeralR}px) rotate(${-deg}deg)`,
              fontSize: size * 0.14,
              fontWeight: '600',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {num}
          </span>
        ))}

        {/* Tick marks */}
        {TICK_DEGS.map((deg, i) => (
          <span
            key={`tick-${i}`}
            className="clock-tick"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: size * 0.02,
              height: size * 0.08,
              background: 'var(--text-muted)',
              transform: `rotate(${deg}deg) translateY(-${tickR}px)`,
              borderRadius: '2px',
            }}
          />
        ))}

        {/* Hour hand */}
        <span
          className="clock-hand"
          style={{
            position: 'absolute',
            bottom: '50%',
            left: '50%',
            width: handWid.hour,
            height: handLen.hour,
            background: 'var(--text)',
            borderRadius: `${handWid.hour / 2}px ${handWid.hour / 2}px 0 0`,
            transformOrigin: 'bottom center',
            transform: `translateX(-50%) rotate(${hourDeg}deg)`,
          }}
        />

        {/* Minute hand */}
        <span
          className="clock-hand"
          style={{
            position: 'absolute',
            bottom: '50%',
            left: '50%',
            width: handWid.minute,
            height: handLen.minute,
            background: 'var(--text)',
            borderRadius: `${handWid.minute / 2}px ${handWid.minute / 2}px 0 0`,
            transformOrigin: 'bottom center',
            transform: `translateX(-50%) rotate(${minuteDeg}deg)`,
          }}
        />

        {showSeconds && (
          <span
            className="clock-hand"
            style={{
              position: 'absolute',
              bottom: '50%',
              left: '50%',
              width: handWid.second,
              height: handLen.second,
              background: 'var(--primary)',
              borderRadius: `${handWid.second / 2}px ${handWid.second / 2}px 0 0`,
              transformOrigin: 'bottom center',
              transform: `translateX(-50%) rotate(${secondDeg}deg)`,
            }}
          />
        )}

        {/* Centre pin */}
        <span
          className="clock-pin"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: size * 0.06,
            height: size * 0.06,
            background: 'var(--primary)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
          }}
        />
      </div>
    </div>
  );
}
