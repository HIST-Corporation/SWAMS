import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { Avatar, Badge, Button, useToast } from '@swams/ui';
import { sendCallRequest } from '../api.js';

/**
 * Invite panel — call only the people you need. Picking someone sends a real
 * call request through `POST /notifications`, so it lands in their bell as a
 * "call" notification; the row flips to "Request sent" once the server
 * answers, never before (§7.5: the server owns the outcome).
 *
 * @param {{ roster: Array<object>, inRoomIds: string[] }} props
 */
export function InvitePanel({ roster, inRoomIds }) {
  const { t } = useTranslation('video');
  const { toast } = useToast();
  const [pending, setPending] = useState(() => new Set());

  const candidates = roster.filter((person) => !inRoomIds.includes(person.id));

  const invite = async (person) => {
    try {
      await sendCallRequest({ name: person.name });
      setPending((all) => new Set(all).add(person.id));
      toast({ title: t('invite.sent', { name: person.name }), description: t('invite.body') });
    } catch {
      toast({ title: t('invite.title'), description: t('invite.failed') });
    }
  };

  return (
    <section aria-labelledby="invite-heading" className="grid gap-2">
      <h3
        id="invite-heading"
        className="text-stage-text flex items-center gap-1.5 text-sm font-semibold"
      >
        <UserPlus aria-hidden="true" size={14} strokeWidth={1.75} />
        {t('invite.title')}
      </h3>
      <p className="text-stage-muted text-xs">{t('invite.body')}</p>

      {candidates.length === 0 ? (
        <p className="text-stage-muted text-xs">{t('invite.empty')}</p>
      ) : (
        <ul className="grid gap-1">
          {candidates.map((person) => {
            const sent = pending.has(person.id);
            return (
              <li key={person.id} className="flex items-center gap-2.5 rounded-input px-1 py-1.5">
                <Avatar name={person.name} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm">{person.name}</span>
                {sent ? (
                  <Badge tone="info">{t('invite.pending')}</Badge>
                ) : (
                  <Button size="sm" variant="secondary" onClick={() => invite(person)}>
                    {t('invite.send')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
