// @ts-check
/**
 * Zod body/query/params validator middleware (master §8.4: one envelope,
 * canonical `validation_failed` code on any schema failure).
 */
import { AppError } from './errors.js';

/**
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source]
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      }));
      return next(
        new AppError('validation_failed', 'Request validation failed', {
          httpStatus: 422,
          details,
        }),
      );
    }
    req[source] = parsed.data;
    return next();
  };
}
