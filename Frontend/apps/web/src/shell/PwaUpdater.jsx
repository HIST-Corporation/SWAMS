import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@swams/ui';
import {
  canOfferInstall,
  initInstallPrompt,
  promptInstall,
  subscribeOfferChange,
  suppressFurtherOffers,
} from '../lib/installPrompt.js';

/**
 * Invisible PWA host (Section 11 rule 8): registers the service worker with
 * `registerType: 'prompt'` so a new version waits behind a toast instead of
 * swapping under the user, and offers installation **after the first
 * confirmed punch** — never on load. Renders nothing; the toasts live in the
 * shared ToastProvider.
 */
export function PwaUpdater() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const offeredThisSession = useRef(false);

  const { updateServiceWorker } = useRegisterSW({
    immediate: true,
    onNeedRefresh() {
      toast({
        title: t('pwa.update.title'),
        description: t('pwa.update.body'),
        duration: 12_000,
        action: { label: t('pwa.update.action'), onAction: () => updateServiceWorker(true) },
      });
    },
    // Offline-ready is deliberately silent (§8.1 rule 5): the shell simply
    // starts working offline; nothing the user needs to acknowledge.
  });

  useEffect(() => {
    initInstallPrompt();
    const maybeOffer = () => {
      if (offeredThisSession.current || !canOfferInstall()) return;
      offeredThisSession.current = true;
      // Suppress the next offer for a week — dismissing the toast counts as
      // "not now". The deferred prompt stays, so Install on this toast works.
      suppressFurtherOffers();
      toast({
        title: t('pwa.install.title'),
        description: t('pwa.install.body'),
        duration: 12_000,
        action: { label: t('pwa.install.action'), onAction: () => promptInstall() },
      });
    };
    maybeOffer();
    return subscribeOfferChange(maybeOffer);
  }, [t, toast]);

  return null;
}
