// @ts-check
/**
 * Request-id middleware — every request gets X-Request-Id (echoed back),
 * matching the frontend api-client which sends one per request.
 */
import { newRequestId } from '../common/http.js';

export function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : newRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
}
