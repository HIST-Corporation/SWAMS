import { useRef, useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@swams/ui';
import { Input } from '@swams/ui';
import { Textarea } from '@swams/ui';
import { Card, CardTitle } from '@swams/ui';
import { useTaskTemplates } from '../hooks/useTasks.js';

/**
 * Board template chooser and save-from-current flow. It owns the query so the
 * TasksPage stays free of template state, and it is only a dialog on top of the
 * existing board — the column configuration itself still comes from the server.
 *
 * @param {{ open: boolean, onClose: () => void, board: object }} props
 */
export function TemplatesDrawer({ open, onClose, board }) {
  const { t } = useTranslation('tasks');
  const { templates, customTemplates, save, apply, remove } = useTaskTemplates({
    enabled: open,
  });

  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');

  const dialogRef = useRef(null);

  const canManage = board?.canManage === true;

  const presetTemplates = templates.filter(
    (template) => !String(template.id).startsWith('tmpl_custom_'),
  );

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button, input, textarea')].filter(
        (node) => !node.disabled && node.getAttribute('aria-hidden') !== 'true',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!open) return null;

  const applyTemplate = (template) => {
    apply.mutate(template.id);
    onClose();
  };

  const saveTemplate = (event) => {
    event.preventDefault();
    if (!saveName.trim() || save.isPending) return;
    save.mutate({ name: saveName.trim(), description: saveDescription.trim(), lanes: board.lanes ?? [] });
  };

  const removeTemplate = (id) => {
    remove.mutate(id);
  };

  const TemplateCard = ({ template, showRemove }) => (
    <Card hover className="bg-surface-sunken flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text">{template.name}</p>
        <p className="text-text-faint text-xs">{template.description}</p>
        <p className="text-text-faint text-xs">{t('templates.lanes', { count: template.lanes?.length ?? 0 })}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => applyTemplate(template)}
          disabled={!canManage || apply.isPending}
          loading={apply.isPending}
          aria-busy={apply.isPending || undefined}
        >
          {t('templates.apply')}
        </Button>
        {showRemove ? (
          <Button
            type="button"
            size="sm"
            variant="quiet"
            onClick={() => removeTemplate(template.id)}
            disabled={remove.isPending}
            loading={remove.isPending}
            aria-busy={remove.isPending || undefined}
          >
            {t('templates.remove')}
          </Button>
        ) : null}
      </div>
    </Card>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-drawer-title"
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-card border border-border bg-surface p-6 shadow-2"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="templates-drawer-title" className="text-xl font-display">
              {t('templates.title')}
            </h2>
            <p className="text-text-muted text-sm">{t('templates.subtitle')}</p>
          </div>
          <button
            type="button"
            aria-label={t('templates.close')}
            onClick={onClose}
            className="rounded-input text-text-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X aria-hidden="true" size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="grid gap-4 pt-4">
          {!canManage ? (
            <p className="rounded-input bg-surface-sunken px-3 py-2 text-sm text-text-faint">
              {t('templates.cannotManage')}
            </p>
          ) : null}

          <section aria-label={t('templates.preBuilt')}>
            <div className="flex items-center justify-between">
              <h3 id="templates-pre-built" className="text-sm font-semibold text-text">
                {t('templates.preBuilt')}
              </h3>
              {canManage ? (
                <Button type="button" size="sm" variant="secondary" onClick={() => document.getElementById('template-form').scrollIntoView({ behavior: 'smooth' })}>
                  <Save aria-hidden="true" size={15} strokeWidth={2} />
                  {t('templates.saveFromCurrent')}
                </Button>
              ) : null}
            </div>

            {presetTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} showRemove={false} />
            ))}
          </section>

          {customTemplates.length > 0 ? (
            <section aria-labelledby="templates-custom">
              <h3 id="templates-custom" className="mb-2 text-sm font-semibold text-text">
                {t('templates.myTemplates')}
              </h3>
              <div className="grid gap-3">
                {customTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} showRemove />
                ))}
              </div>
            </section>
          ) : (
            <p className="text-text-faint text-sm">{t('templates.noCustom')}</p>
          )}

          {canManage ? (
            <Card hover id="template-form" className="bg-surface-sunken overflow-hidden">
              <CardTitle id="templates-save-title">{t('templates.saveTitle')}</CardTitle>
              <form
                id="save-template-form"
                onSubmit={saveTemplate}
                className="grid gap-3 pt-3"
              >
                <label className="grid gap-1">
                  <span className="text-text-muted text-xs font-medium">{t('templates.name')}</span>
                  <Input
                    value={saveName}
                    onChange={(event) => setSaveName(event.target.value)}
                    placeholder={t('templates.namePlaceholder')}
                    maxLength={40}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-text-muted text-xs font-medium">{t('templates.description')}</span>
                  <Textarea
                    value={saveDescription}
                    onChange={(event) => setSaveDescription(event.target.value)}
                    placeholder={t('templates.descriptionPlaceholder')}
                    maxLength={120}
                    rows={2}
                  />
                </label>
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    loading={save.isPending}
                    disabled={save.isPending || !saveName.trim()}
                  >
                    {t('templates.save')}
                  </Button>
                  {save.error ? (
                    <p
                      role="alert"
                      className="text-xs text-danger-text"
                    >
                      {save.error.message}
                    </p>
                  ) : null}
                  {save.isSuccess ? (
                    <p role="status" className="text-xs text-success-text">
                      {t('templates.saved')}
                    </p>
                  ) : null}
                </div>
              </form>
            </Card>
          ) : null}

        </div>
      </div>
    </div>
  );
}
