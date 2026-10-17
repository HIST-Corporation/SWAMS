import { createContext } from 'react';

/**
 * Session context lives in its own module so tests can stub the provider
 * value without mounting the real machine (SessionProvider.jsx re-exports it).
 */
export const SessionContext = createContext(null);
