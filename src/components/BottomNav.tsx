import { ChartColumn, Landmark, LayoutDashboard, Plus, ShieldCheck } from 'lucide-react';

export type View = 'dashboard' | 'tax' | 'spending' | 'admin';

interface Props {
  view: View;
  onChangeView: (view: View) => void;
  onQuickAdd: () => void;
  isAdmin: boolean;
  /** Shown as a dot on the tax tab when something is due or overdue. */
  taxNeedsAttention: boolean;
}

const TABS: { view: View; label: string; Icon: typeof LayoutDashboard }[] = [
  { view: 'dashboard', label: 'Home', Icon: LayoutDashboard },
  { view: 'tax', label: 'Tax', Icon: Landmark },
  { view: 'spending', label: 'Spending', Icon: ChartColumn },
];

/**
 * Fixed bottom navigation.
 *
 * Every tab navigates somewhere real — the previous version had buttons that
 * only fired alert() dialogs. The centre action is raised and sized past the
 * 44px minimum because it is the most used control in the app.
 */
export function BottomNav({
  view,
  onChangeView,
  onQuickAdd,
  isAdmin,
  taxNeedsAttention,
}: Props) {
  const tabs = isAdmin
    ? [...TABS, { view: 'admin' as View, label: 'Admin', Icon: ShieldCheck }]
    : TABS;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-ink-950/90"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pt-2 pb-safe">
        {tabs.slice(0, 2).map(({ view: tabView, label, Icon }) => (
          <NavButton
            key={tabView}
            active={view === tabView}
            label={label}
            onClick={() => onChangeView(tabView)}
            badge={tabView === 'tax' && taxNeedsAttention}
          >
            <Icon className="size-5" />
          </NavButton>
        ))}

        <button
          type="button"
          onClick={onQuickAdd}
          aria-label="Add a transaction"
          className="mx-1 grid size-14 shrink-0 -translate-y-3 place-items-center rounded-[1.125rem] bg-brand-600 text-white shadow-lg shadow-brand-300/50 transition-transform active:scale-90 dark:shadow-none"
        >
          <Plus className="size-7" />
        </button>

        {tabs.slice(2).map(({ view: tabView, label, Icon }) => (
          <NavButton
            key={tabView}
            active={view === tabView}
            label={label}
            onClick={() => onChangeView(tabView)}
          >
            <Icon className="size-5" />
          </NavButton>
        ))}
      </div>
    </nav>
  );
}

function NavButton({
  active,
  label,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  badge?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative flex min-w-[60px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-bold tracking-wide uppercase transition-colors ${
        active
          ? 'text-brand-700 dark:text-brand-300'
          : 'text-ink-900/40 hover:text-ink-900/65 dark:text-white/40 dark:hover:text-white/65'
      }`}
    >
      {children}
      {label}
      {badge && (
        <span className="absolute top-1.5 right-2.5 size-2 rounded-full bg-warn ring-2 ring-white dark:ring-ink-950" />
      )}
    </button>
  );
}
