import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AudioLines, Bot, CheckCircle2 } from 'lucide-react';
import { Switch, cn } from '@swams/ui';

/**
 * Sample transcript — speaker-attributed lines the assistant "hears". MOCK
 * ONLY: no model runs here (§12.1), the copy under the panel says so.
 */
const TRANSCRIPT = [
  { who: 'Sita Shrestha', text: 'Yesterday’s blockers first — API rate limit?' },
  { who: 'Ramesh Adhikari', text: 'Fixed and deployed; latency is back to 98ms.' },
  { who: 'Anita Thapa', text: 'Header rework is ready for review.' },
  { who: 'Sita Shrestha', text: 'Then we ship the attendance calendar Friday.' },
];

const BRIEF = [
  'API rate limit resolved and deployed.',
  'Header rework ready for review.',
  'Attendance calendar targeted for Friday.',
];

/**
 * The AI meeting assistant (rail tab). When enabled it captures the room's
 * microphone state (real device from `useRoomDevices`) and streams the sample
 * transcript with each speaker's name, building a running brief and a final
 * conclusion. Everything it says is a labelled fixture — it is a preview of
 * the assistant, not a running model.
 *
 * @param {{ micOn: boolean }} props
 */
export function AiPanel({ micOn }) {
  const { t } = useTranslation('video');
  const [enabled, setEnabled] = useState(false);
  const [shown, setShown] = useState(0);

  // While enabled, reveal one transcript line every couple of seconds — the
  // "live" cadence of the preview; disabled, it stops where it is.
  useEffect(() => {
    if (!enabled || shown >= TRANSCRIPT.length) return undefined;
    const id = setTimeout(() => setShown((n) => n + 1), 2_000);
    return () => clearTimeout(id);
  }, [enabled, shown]);

  const done = shown >= TRANSCRIPT.length;

  return (
    <div className="grid gap-3">
      <label className="border-stage-border bg-stage flex items-center justify-between gap-3 rounded-input border px-3 py-2">
        <span className="flex items-center gap-2 text-sm">
          <Bot aria-hidden="true" size={15} strokeWidth={1.75} />
          {t('ai.title')}
        </span>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={t('ai.enable')} />
      </label>

      <p
        className={cn(
          'rounded-input px-3 py-2 text-xs',
          micOn ? 'bg-success-soft text-success-text' : 'bg-stage text-stage-muted',
        )}
      >
        <AudioLines aria-hidden="true" className="mr-1.5 inline align-[-2px]" size={14} />
        {micOn ? t('ai.listening') : t('ai.micNeeded')}
      </p>

      {enabled ? (
        <div className="grid gap-3">
          <section aria-label={t('ai.transcript')} className="grid gap-1.5">
            <h4 className="text-stage-muted text-xs font-semibold">{t('ai.transcript')}</h4>
            <ul className="grid gap-1.5 text-xs">
              {TRANSCRIPT.slice(0, shown).map((line, index) => (
                <li key={index} className="bg-stage rounded-input px-2.5 py-1.5">
                  <span className="text-primary font-semibold">{line.who}</span>
                  <span className="text-stage-text">
                    {' — '}
                    {line.text}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label={t('ai.brief')} className="grid gap-1.5">
            <h4 className="text-stage-muted text-xs font-semibold">{t('ai.brief')}</h4>
            <ul className="text-stage-text grid list-disc gap-1 pl-4 text-xs">
              {BRIEF.slice(0, Math.max(0, shown - 1)).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="text-stage-muted text-xs">{t('ai.running')}</p>
          </section>

          {done ? (
            <section aria-label={t('ai.conclusion')} className="grid gap-1.5">
              <h4 className="text-stage-text flex items-center gap-1.5 text-xs font-semibold">
                <CheckCircle2 aria-hidden="true" size={14} className="text-success" />
                {t('ai.conclusion')}
              </h4>
              <p className="bg-stage text-stage-text rounded-input px-2.5 py-2 text-xs">
                {t('ai.done')}
              </p>
            </section>
          ) : null}
        </div>
      ) : null}

      <p className="text-stage-muted text-xs">{t('ai.sampleNote')}</p>
    </div>
  );
}
