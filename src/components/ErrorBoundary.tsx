import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * A real error boundary.
 *
 * The previous implementation listened for `window` error events, which never
 * fire for errors thrown during React rendering — the exact case a boundary
 * exists to catch. Only a class component with componentDidCatch works.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in render tree', error, info.componentStack);
  }

  private readableMessage(error: Error): string {
    // Firestore permission failures arrive as a JSON blob from handleFirestoreError.
    if (error.message.startsWith('{')) {
      return 'The database refused that request. Your access may have been revoked.';
    }
    return error.message || 'An unexpected error occurred.';
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-50 p-4 dark:bg-ink-950">
        <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-black/5 bg-white p-6 text-center sm:p-8 dark:border-white/10 dark:bg-ink-900">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-full bg-money-out/10">
            <AlertCircle className="size-7 text-money-out" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Something broke</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-900/60 dark:text-white/60">
            {this.readableMessage(error)}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="w-full rounded-[var(--radius-tile)] bg-brand-600 py-3.5 font-bold text-white transition-colors hover:bg-brand-700"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full rounded-[var(--radius-tile)] py-3.5 text-sm font-semibold text-ink-900/60 transition-colors hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
            >
              Reload the app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
