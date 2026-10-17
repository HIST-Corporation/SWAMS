import { setupWorker } from 'msw/browser';
import { handlers } from './handlers.js';

/** MSW browser worker — labeled mock server, never presented as production behavior. */
export const worker = setupWorker(...handlers);
