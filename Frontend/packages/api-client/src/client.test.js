import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http } from 'msw';
import { createApiClient, AppError, toAppError } from './index.js';

const seen = { requestId: null, refreshCount: 0, token: 'stale' };

const server = setupServer(
  http.get('*/ping', ({ request }) => {
    seen.requestId = request.headers.get('x-request-id');
    return Response.json({ ok: true });
  }),
  http.get('*/secure', ({ request }) => {
    if (request.headers.get('authorization') === 'Bearer fresh') {
      return Response.json({ ok: true });
    }
    return new Response(null, { status: 401 });
  }),
  http.get('*/boom', () =>
    Response.json(
      { code: 'server_error', message: 'The attendance service is down.', requestId: 'srv-42' },
      { status: 500 },
    ),
  ),
  http.get('*/slow-refresh-guard', () => new Response(null, { status: 401 })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function makeClient() {
  return createApiClient({
    baseURL: 'https://api.test/v1',
    getAccessToken: () => seen.token,
    refreshSession: async () => {
      seen.refreshCount += 1;
      await new Promise((r) => setTimeout(r, 60));
      seen.token = 'fresh';
    },
    makeRequestId: () => 'req_test_1',
  });
}

describe('createApiClient', () => {
  it('attaches an X-Request-Id to every request', async () => {
    seen.requestId = null;
    await makeClient().get('/ping');
    expect(seen.requestId).toBe('req_test_1');
  });

  it('maps server errors to one AppError shape with requestId', async () => {
    const client = makeClient();
    const err = await client.get('/boom').catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('server_error');
    expect(err.message).toBe('The attendance service is down.');
    expect(err.requestId).toBe('srv-42');
    expect(err.status).toBe(500);
  });

  it('shares a single refresh across parallel 401s', async () => {
    seen.token = 'stale';
    seen.refreshCount = 0;
    const client = makeClient();
    const [a, b] = await Promise.all([client.get('/secure'), client.get('/secure')]);
    expect(a.data.ok).toBe(true);
    expect(b.data.ok).toBe(true);
    expect(seen.refreshCount).toBe(1);
  });
  it('never refreshes on a skipAuthRefresh 401 (deadlock guard)', async () => {
    // Reproduces the boot path: refreshSession goes through the SAME client
    // with skipAuthRefresh. Without the guard the interceptor awaits the
    // refresh promise that contains itself and nothing ever settles.
    server.use(http.post('*/auth/refresh', () => new Response(null, { status: 401 })));
    const onSessionEnded = vi.fn();
    const refreshCalls = [0];
    const client = createApiClient({
      baseURL: 'https://api.test/v1',
      getAccessToken: () => 'stale',
      refreshSession: async () => {
        refreshCalls[0] += 1;
        await client.post('/auth/refresh', null, { skipAuthRefresh: true });
      },
      onSessionEnded,
      makeRequestId: () => 'req_test_1',
    });

    const err = await Promise.race([
      client.get('/secure').then(
        () => null,
        (e) => e,
      ),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('deadlock: refresh promise never settled')), 2_000),
      ),
    ]);

    expect(err, 'request must reject, not hang').toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
    expect(refreshCalls[0]).toBe(1);
    expect(onSessionEnded).toHaveBeenCalled();
  });
});

describe('toAppError', () => {
  it('reports network failures as offline-friendly messages', () => {
    const err = toAppError(new Error('Network Error'));
    expect(err.code).toBe('network_error');
    expect(err.message).toMatch(/reach the server/);
  });

  it('keeps AppError instances untouched', () => {
    const original = new AppError({ code: 'x', message: 'y' });
    expect(toAppError(original)).toBe(original);
  });
});
