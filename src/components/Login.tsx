import { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Wallet } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface Props {
  accessError: string | null;
}

export function Login({ accessError }: Props) {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (caught) {
      const code = (caught as { code?: string })?.code;
      setError(
        code === 'auth/popup-closed-by-user'
          ? 'Sign-in was cancelled.'
          : 'Sign-in failed. Check your connection and try again.',
      );
    } finally {
      setSigningIn(false);
    }
  };

  const message = error ?? accessError;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-brand-50 p-4 dark:bg-ink-950">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-[var(--radius-card)] border border-black/5 bg-white p-7 text-center sm:p-9 dark:border-white/10 dark:bg-ink-900"
      >
        <div className="mx-auto mb-7 grid size-16 place-items-center rounded-[1.25rem] bg-brand-600 shadow-lg shadow-brand-200 dark:shadow-none">
          <Wallet className="size-8 text-white" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Payground</h1>
        <p className="mt-2.5 text-sm leading-relaxed text-ink-900/60 dark:text-white/60">
          Track what you earn, what you claim, and what you owe the IRD.
        </p>

        {message && (
          <p
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-[var(--radius-tile)] bg-money-out/10 p-3.5 text-left text-sm text-money-out-ink dark:text-money-out-ink-dark"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={signingIn}
          className="mt-7 flex w-full items-center justify-center gap-3 rounded-[var(--radius-tile)] bg-brand-600 py-4 font-bold text-white transition-all hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt=""
            className="size-6 rounded-full bg-white p-1"
          />
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>

        <p className="mt-6 text-xs text-ink-900/45 dark:text-white/40">
          Invitation only. Contact the administrator for access.
        </p>
      </motion.div>
    </div>
  );
}
