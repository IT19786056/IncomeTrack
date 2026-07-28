import { useState } from 'react';
import { Check, Copy, UserPlus, X } from 'lucide-react';
import { revokeInvitation } from '../lib/repository';

interface Props {
  invitations: { id: string; email: string; status: string }[];
  onInvite: () => void;
}

export function AdminPanel({ invitations, onInvite }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const copyInviteLink = async (email: string) => {
    const message = `You've been invited to Payground. Sign in with Google at ${window.location.origin} using ${email}.`;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(email);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      console.error('Clipboard unavailable');
    }
  };

  const revoke = async (email: string) => {
    setRevoking(email);
    try {
      await revokeInvitation(email);
    } catch (error) {
      console.error('Failed to revoke invitation', error);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight">Invitations</h2>
          <p className="mt-0.5 text-xs text-ink-900/55 dark:text-white/50">
            Only invited addresses can sign in.
          </p>
        </div>
        <button
          type="button"
          onClick={onInvite}
          className="flex shrink-0 items-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-700"
        >
          <UserPlus className="size-4" />
          Invite
        </button>
      </div>

      {invitations.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-900/50 dark:text-white/45">
          No invitations yet. Invite someone to give them access.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {invitations.map((invite) => (
            <li
              key={invite.id}
              className="flex items-center gap-3 rounded-[var(--radius-tile)] bg-black/[0.03] p-4 dark:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{invite.email}</p>
                <p
                  className={`mt-0.5 text-[11px] font-bold tracking-wider uppercase ${
                    invite.status === 'accepted'
                      ? 'text-money-in-ink dark:text-money-in-ink-dark'
                      : 'text-warn'
                  }`}
                >
                  {invite.status}
                </p>
              </div>

              <button
                type="button"
                onClick={() => copyInviteLink(invite.email)}
                aria-label={`Copy invitation message for ${invite.email}`}
                className="grid size-10 shrink-0 place-items-center rounded-full text-ink-900/45 transition-colors hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
              >
                {copied === invite.email ? (
                  <Check className="size-4 text-money-in-ink dark:text-money-in-ink-dark" />
                ) : (
                  <Copy className="size-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => revoke(invite.email)}
                disabled={revoking === invite.email}
                aria-label={`Revoke access for ${invite.email}`}
                className="grid size-10 shrink-0 place-items-center rounded-full text-ink-900/45 transition-colors hover:bg-money-out/10 hover:text-money-out-ink disabled:opacity-50 dark:text-white/45"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
