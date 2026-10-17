import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, FormField, Input } from '@swams/ui';

/**
 * Wizard step 2: sites (8.8 sample sites: Baneshwor, Lalitpur, Pokhara).
 * Empty state is designed: an invite to add the first site, never blank.
 */
export function WizardSites({ draft, errors, onUpdate }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  const addSite = (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || draft.sites.includes(trimmed)) {
      setName('');
      return;
    }
    onUpdate({ sites: [...draft.sites, trimmed] });
    setName('');
  };

  const removeSite = (site) => {
    onUpdate({ sites: draft.sites.filter((s) => s !== site) });
  };

  return (
    <section className="grid gap-4" aria-label={t('wizard.step2')}>
      <FormField
        label={t('wizard.sites')}
        hint={t('wizard.sitesHint')}
        error={errors.sites ? t(errors.sites) : undefined}
        required
      >
        {({ id, describedBy, invalid }) => (
          <div className="flex gap-2">
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              name="site"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('wizard.sitePlaceholder')}
            />
            <Button type="button" variant="secondary" onClick={addSite}>
              {t('wizard.addSite')}
            </Button>
          </div>
        )}
      </FormField>

      {draft.sites.length === 0 ? (
        <p className="border-border text-text-muted rounded-input border border-dashed px-3 py-4 text-sm">
          {t('wizard.sitesEmpty')}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {draft.sites.map((site) => (
            <li
              key={site}
              className="bg-surface border-border text-text rounded-pill flex items-center gap-2 border px-3 py-1.5 text-sm"
            >
              {site}
              <button
                type="button"
                onClick={() => removeSite(site)}
                className="text-text-faint hover:text-danger-text focus-visible:ring-primary rounded-pill focus-visible:outline-none focus-visible:ring-2"
                aria-label={t('wizard.removeSite', { site })}
              >
                <X aria-hidden="true" size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
