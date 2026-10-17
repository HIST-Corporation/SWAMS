// @ts-check
/**
 * Async route wrapper — forwards rejections to the error middleware.
 * Keeps every controller free of try/catch noise (master §8.4).
 */
import { toAppError } from './errors.js';

/**
 * @template {(req: any, res: any, next: any) => Promise<any>} T
 * @param {T} fn
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(toAppError(err)));
  };
}
