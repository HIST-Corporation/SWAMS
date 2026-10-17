import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useActor } from '@xstate/react';
import { Button, Stepper } from '@swams/ui';
import { createOrgSetupMachine, wizardStepErrors } from '../machines/orgSetup.machine.js';
import { api } from '../../../lib/apiClient.js';
import { WizardBasics } from '../components/WizardBasics.jsx';
import { WizardSites } from '../components/WizardSites.jsx';
import { WizardCalendar } from '../components/WizardCalendar.jsx';
import { WizardReview } from '../components/WizardReview.jsx';

/**
 * Org setup wizard (build order 2; screen-inventory "Org setup wizard", R2):
 * BS calendar, sites, fiscal year. Renders from the wizard machine
 * (`editing.step1..3`, `reviewing`, `submitting`, `done`); the machine owns
 * the workflow, the step components own inline validation display.
 */
export function OrgSetupWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const machine = useMemo(
    () => createOrgSetupMachine(async (draft) => (await api.post('/org/setup', draft)).data),
    [],
  );
  // useActor (not useActorRef): subscribes the component to snapshot changes.
  const [state, send] = useActor(machine);

  if (state.matches('done')) {
    return (
      <main className="bg-bg text-text mx-auto min-h-dvh max-w-reading px-4 py-16">
        <h1 className="text-2xl">{t('wizard.done.title')}</h1>
        <p className="text-text-muted mt-2 text-sm">
          {t('wizard.done.body', { name: state.context.org?.name })}
        </p>
        <div className="mt-6">
          <Button onClick={() => navigate('/', { replace: true })}>
            {t('wizard.done.continue')}
          </Button>
        </div>
      </main>
    );
  }

  const step = state.matches('editing.step1')
    ? 1
    : state.matches('editing.step2')
      ? 2
      : state.matches('editing.step3')
        ? 3
        : 4;
  // Inline errors only after a failed Continue (machine `attempted` flag).
  const errors = state.context.attempted ? wizardStepErrors(state.context.draft, step) : {};
  const onUpdate = (patch) => send({ type: 'UPDATE', patch });
  const reviewStep = step === 4;

  return (
    <main className="bg-bg text-text mx-auto min-h-dvh max-w-reading px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl">{t('wizard.title')}</h1>
        <p className="text-text-muted mt-1 text-sm">{t('wizard.subtitle')}</p>
      </header>

      <Stepper
        steps={t('wizard.steps', { returnObjects: true })}
        current={step}
        aria-label={t('wizard.progress')}
      />

      <form
        className="mt-8 grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (reviewStep) send({ type: 'SUBMIT' });
          else send({ type: 'NEXT' });
        }}
        noValidate
        aria-busy={state.matches('submitting')}
      >
        {step === 1 ? (
          <WizardBasics draft={state.context.draft} errors={errors} onUpdate={onUpdate} />
        ) : null}
        {step === 2 ? (
          <WizardSites draft={state.context.draft} errors={errors} onUpdate={onUpdate} />
        ) : null}
        {step === 3 ? (
          <WizardCalendar draft={state.context.draft} errors={errors} onUpdate={onUpdate} />
        ) : null}
        {reviewStep ? <WizardReview draft={state.context.draft} /> : null}

        {state.context.lastError ? (
          <p
            role="alert"
            className="bg-danger-soft text-danger-text border-danger rounded-input border px-3 py-2 text-sm"
          >
            {t('wizard.error.submit')}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          {step === 1 ? (
            <span className="text-text-faint text-sm">{t('wizard.firstStep')}</span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => send({ type: 'BACK' })}
              disabled={state.matches('submitting')}
            >
              {t('wizard.back')}
            </Button>
          )}
          <Button type="submit" loading={state.matches('submitting')}>
            {reviewStep ? t('wizard.finish') : t('wizard.next')}
          </Button>
        </div>
      </form>
    </main>
  );
}
