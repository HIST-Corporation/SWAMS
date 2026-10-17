import { useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button } from '@swams/ui';

/**
 * Per-route error boundary (Section 10): shows the AppError message, the
 * request ID collapsed under "Details", and offers reload + report.
 */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : (error?.message ?? 'Something went wrong');
  const requestId = error?.requestId;

  return (
    <main
      role="alert"
      className="mx-auto flex min-h-dvh max-w-[720px] flex-col items-start justify-center gap-4 p-6"
    >
      <h1 className="text-xl">This page hit a problem</h1>
      <p className="text-muted text-base text-text-muted">{message}</p>
      {requestId ? (
        <details className="text-faint text-sm text-text-faint">
          <summary className="cursor-pointer">Details</summary>
          <p className="tabular">Request ID: {requestId}</p>
        </details>
      ) : null}
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Go back
        </Button>
      </div>
    </main>
  );
}
