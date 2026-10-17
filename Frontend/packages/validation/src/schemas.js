import { z } from 'zod';

/** Theme preference persisted to localStorage + PATCH /me/preferences (Section 8.3). */
export const themePreferenceSchema = z.enum(['light', 'dark', 'system']);

/** Language preference (Section 8.10). */
export const languagePreferenceSchema = z.enum(['en', 'ne']);

/** Calendar preference: BS or AD dual-date default (Section 8.10). */
export const calendarPreferenceSchema = z.enum(['bs', 'ad']);

/** PATCH /me/preferences body (frontend view of the contract). */
export const preferencesPatchSchema = z
  .object({
    theme: themePreferenceSchema.optional(),
    language: languagePreferenceSchema.optional(),
    calendar: calendarPreferenceSchema.optional(),
  })
  .strict();

/** Sign-in form (local shape until the auth contract lands in openapi.yaml). */
export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/** Password-reset request (login screen's forgot-password view). */
export const passwordResetRequestSchema = z.object({
  email: z.string().email(),
});

/** Leave request draft — full policy preview wiring lands in build order 5. */
export const leaveRequestDraftSchema = z
  .object({
    start: z.string().min(1),
    end: z.string().min(1),
    type: z.enum(['annual', 'sick', 'unpaid', 'special']),
    note: z.string().max(500).optional(),
  })
  .refine((v) => new Date(v.start) <= new Date(v.end), {
    message: 'End date must be on or after the start date',
    path: ['end'],
  });
