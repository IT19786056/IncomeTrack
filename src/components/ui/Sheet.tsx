import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  title: string;
  /** Optional one-line explanation under the title. */
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * A bottom sheet on phones, a centred dialog from `sm` up.
 *
 * Sheets rise from the bottom edge on mobile because that is where the thumb
 * is and where the trigger sits. Content scrolls inside the sheet so a long
 * form never pushes the page itself into a scroll.
 */
export function Sheet({ open, title, description, onClose, children }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    // Lock the page behind the sheet so only the sheet scrolls.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the sheet for keyboard and screen-reader users.
    const firstField = panelRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button',
    );
    firstField?.focus();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/60 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            onClick={(event) => event.stopPropagation()}
            className="flex max-h-[92dvh] w-full flex-col rounded-t-[var(--radius-card)] bg-white sm:max-w-md sm:rounded-[var(--radius-card)] dark:bg-ink-900"
          >
            <div className="flex items-start justify-between gap-4 border-b border-black/5 px-5 pt-5 pb-4 sm:px-6 dark:border-white/10">
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-ink-900/55 dark:text-white/55">
                    {description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-900/50 transition-colors hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 pb-safe sm:px-6">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
