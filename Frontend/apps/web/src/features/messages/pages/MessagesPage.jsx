import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Users } from 'lucide-react';
import { Button, PreviewNotice } from '@swams/ui';
import { CONVERSATIONS, PEOPLE, THREADS, sortByAvailability } from '../mocks/fixtures.js';
import { StaffList } from '../components/StaffList.jsx';
import { TeamRail } from '../components/TeamRail.jsx';
import { ThreadBubbles, ThreadComposer, ThreadHeader, nowTime } from '../components/ThreadView.jsx';

/**
 * `/messages` — DM list + thread (screen inventory R3). SAMPLE DATA and no
 * transport: the thread is a fixture, and anything typed goes into local
 * state with a note underneath saying it stays in this browser — the copy,
 * never the send button, decides what is honest (§12.1). The real-time
 * dependency is contract request 10 (Socket.IO).
 */
export function MessagesPage() {
  const { t } = useTranslation('messages');
  const { t: tn } = useTranslation('nav');
  const [active, setActive] = useState('u_ramesh');
  const [threads, setThreads] = useState(THREADS);
  const [query, setQuery] = useState('');

  // The open thread resolves against the WHOLE roster, not just seeded DMs, so
  // picking someone from the top Team rail who has no conversation yet still
  // shows their name/role/status header (and an honest empty thread) instead
  // of a blank box. Availability still rides the roster's own field (§7.6).
  const activeConv =
    CONVERSATIONS.find((c) => c.id === active) ?? PEOPLE.find((p) => p.id === active) ?? null;
  const messages = useMemo(() => threads[active] ?? [], [threads, active]);

  // The whole roster is listed; search narrows it by name and availability is
  // the standing filter — online floats to the top (toward the left), then
  // away → busy → do-not-disturb → offline — so whoever is reachable now is
  // always the first row you meet (§8.4).
  const people = useMemo(() => {
    const term = query.trim().toLowerCase();
    const matched = term
      ? CONVERSATIONS.filter((person) => person.name.toLowerCase().includes(term))
      : CONVERSATIONS;
    return sortByAvailability(matched);
  }, [query]);

  const send = (text) => {
    const message = text.trim();
    if (!message) return;
    setThreads((all) => ({
      ...all,
      [active]: [
        ...(all[active] ?? []),
        {
          id: `${active}-${Date.now()}`,
          sender: 'self',
          text: message,
          time: nowTime(),
          self: true,
        },
      ],
    }));
  };

  return (
    <div className="mx-auto flex max-w-page flex-col gap-3 lg:h-[calc(100dvh-6.5rem)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl">{tn('messages')}</h1>
          <p className="text-text-muted mt-0.5 text-xs">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled>
            <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
            {t('newDm')}
          </Button>
          <Button size="sm" disabled>
            <Users aria-hidden="true" size={16} strokeWidth={1.75} />
            {t('newGroup')}
          </Button>
        </div>
      </header>

      <PreviewNotice />

      {/* The Team rail sits ABOVE the whole message box (Messenger's "active
          now" strip): every colleague is one tap away, online first, without
          being folded into the Direct Messages list below. */}
      <TeamRail people={PEOPLE} activeId={active} onOpen={(person) => setActive(person.id)} />

      {/* The message box takes the remaining height (`flex-1 min-h-0`) so the
          whole screen — rail, list and thread — fits without the page
          scrolling. Only the list and the thread scroll internally. */}
      <section className="border-border bg-surface grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-card border md:grid-cols-[320px_1fr]">
        <aside className="border-border flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
          <div className="border-border border-b p-3">
            <input
              type="search"
              aria-label={t('search')}
              placeholder={t('search')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="border-border bg-surface-sunken focus:border-primary w-full rounded-input border px-3 py-2 text-sm outline-none"
            />
          </div>
          <div className="border-border text-text-muted border-b px-4 py-2 text-xs font-semibold">
            {t('sectionDm')}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto max-h-[45vh] md:max-h-none">
            <StaffList
              people={people}
              activeId={active}
              onOpen={(person) => setActive(person.id)}
            />
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <ThreadHeader person={activeConv} />

          <div className="grid min-h-0 flex-1 content-start gap-2 overflow-y-auto px-4 py-3 md:px-6">
            <ThreadBubbles messages={messages} />
          </div>

          <ThreadComposer onSend={send} />
        </div>
      </section>
    </div>
  );
}
