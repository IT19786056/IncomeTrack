/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  LogOut,
  Target,
  TriangleAlert,
} from 'lucide-react';
import { logout } from './firebase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useFinancialData, useInvitations } from './hooks/useFinancialData';
import { useTaxOverview } from './hooks/useTaxOverview';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './components/Login';
import { BalanceCard } from './components/BalanceCard';
import { TaxSummaryCard } from './components/TaxSummaryCard';
import { TaxScreen } from './components/TaxScreen';
import { MonthlyFlowChart } from './components/MonthlyFlowChart';
import { SavingsChart } from './components/SavingsChart';
import { SpendingBreakdown } from './components/SpendingBreakdown';
import { BudgetList } from './components/BudgetList';
import { TransactionList } from './components/TransactionList';
import { AiInsights } from './components/AiInsights';
import { AdminPanel } from './components/AdminPanel';
import { BottomNav, type View } from './components/BottomNav';
import { Sheet } from './components/ui/Sheet';
import { IncomeForm } from './components/forms/IncomeForm';
import { ExpenseForm } from './components/forms/ExpenseForm';
import { CategoryForm } from './components/forms/CategoryForm';
import { InviteForm } from './components/forms/InviteForm';
import { TaxSetupForm } from './components/forms/TaxSetupForm';
import { deleteExpense, deleteIncome, markFilingSettled, unmarkFilingSettled } from './lib/repository';
import {
  categoryBudgets,
  totals,
  withinMonth,
  withinYa,
  yearsWithActivity,
} from './lib/transactions';
import { monthLabel, yaStartYearForDate, type FilingPeriod } from './lib/tax';
import type { TransactionView } from './types';

registerSW({ immediate: true });

type SheetState =
  | { kind: 'quickAdd' }
  | { kind: 'income'; existing?: TransactionView }
  | { kind: 'expense'; existing?: TransactionView }
  | { kind: 'category' }
  | { kind: 'invite' }
  | { kind: 'taxSetup' }
  | null;

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AuthGate() {
  const { user, profile, loading, accessError } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-brand-50 dark:bg-ink-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          className="size-10 rounded-full border-[3px] border-brand-600 border-t-transparent"
        />
      </div>
    );
  }

  // Both must be present: a signed-in user without a profile was refused access.
  return user && profile ? <AppShell /> : <Login accessError={accessError} />;
}

function AppShell() {
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const data = useFinancialData(user?.uid);
  const invitations = useInvitations(isAdmin);

  const [view, setView] = useState<View>('dashboard');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [yaStartYear, setYaStartYear] = useState(() =>
    yaStartYearForDate(new Date()),
  );
  // Which month the spending breakdown is showing; starts on the current one.
  const [spendMonth, setSpendMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const overview = useTaxOverview(
    data.transactions,
    data.taxProfile,
    data.settledDeadlines,
    yaStartYear,
  );

  // Held as plain numbers so they are stable dependencies across renders.
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const { transactions, categories } = data;

  const allTime = useMemo(() => totals(transactions), [transactions]);
  const thisMonth = useMemo(
    () => totals(withinMonth(transactions, currentYear, currentMonth)),
    [transactions, currentYear, currentMonth],
  );
  const yearTotals = useMemo(
    () => totals(withinYa(transactions, yaStartYear)),
    [transactions, yaStartYear],
  );
  const budgets = useMemo(
    () => categoryBudgets(categories, transactions, currentYear, currentMonth),
    [categories, transactions, currentYear, currentMonth],
  );
  const availableYears = useMemo(() => yearsWithActivity(transactions), [transactions]);

  const closeSheet = () => setSheet(null);

  const handleDelete = async (transaction: TransactionView) => {
    if (transaction.kind === 'income') {
      await deleteIncome(transaction.id);
    } else {
      await deleteExpense(transaction.id);
    }
  };

  const handleEdit = (transaction: TransactionView) => {
    setSheet({
      kind: transaction.kind === 'income' ? 'income' : 'expense',
      existing: transaction,
    });
  };

  const handleSettle = (
    year: number,
    period: FilingPeriod,
    amount: number,
  ) => {
    if (user) void markFilingSettled(user.uid, year, period, amount);
  };

  // Stepping never runs past the current month, since there is no data ahead.
  const stepSpendMonth = (delta: number) => {
    setSpendMonth((current) => {
      const moved = new Date(current.year, current.month + delta, 1);
      if (moved > new Date(currentYear, currentMonth, 1)) return current;
      return { year: moved.getFullYear(), month: moved.getMonth() };
    });
  };

  const canStepForward =
    spendMonth.year !== currentYear || spendMonth.month !== currentMonth;

  const taxNeedsAttention =
    overview.overdue.length > 0 ||
    (overview.nextAction != null && overview.nextAction.daysRemaining <= 14);

  const monthName = monthLabel(today);

  const HEADINGS: Record<View, string> = {
    dashboard: 'Payground',
    tax: 'Income tax',
    spending: 'Spending',
    admin: 'Admin',
  };

  return (
    <div className="min-h-dvh bg-brand-50 pb-28 dark:bg-ink-950">
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-safe pb-4 sm:px-6">
        <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">
          {HEADINGS[view]}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="size-9 rounded-full ring-2 ring-white dark:ring-ink-800"
            />
          )}
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Sign out"
            className="grid size-10 place-items-center rounded-full text-ink-900/45 transition-colors hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 sm:px-6">
        {data.error && (
          <p
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-[var(--radius-tile)] bg-money-out/10 p-4 text-sm text-money-out-ink dark:text-money-out-ink-dark"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {data.error}
          </p>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {view === 'dashboard' && (
              <>
                <BalanceCard
                  allTime={allTime}
                  thisMonth={thisMonth}
                  monthName={monthName}
                  onAddIncome={() => setSheet({ kind: 'income' })}
                  onAddExpense={() => setSheet({ kind: 'expense' })}
                />
                <TaxSummaryCard
                  overview={overview}
                  onOpenDetail={() => setView('tax')}
                />
                <MonthlyFlowChart
                  transactions={transactions}
                  yaStartYear={yaStartYear}
                />
                <SavingsChart
                  transactions={transactions}
                  yaStartYear={yaStartYear}
                />
                <BudgetList
                  budgets={budgets}
                  monthName={monthName}
                  onAddCategory={() => setSheet({ kind: 'category' })}
                />
                <TransactionList
                  title="Recent activity"
                  emptyMessage="Nothing logged yet. Add your first income or expense."
                  transactions={transactions}
                  limit={6}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
                <AiInsights yearTotals={yearTotals} tax={overview.current} />
              </>
            )}

            {view === 'tax' && (
              <TaxScreen
                overview={overview}
                availableYears={availableYears}
                onChangeYear={setYaStartYear}
                onSettle={handleSettle}
                onUnsettle={(year, period) => {
                  if (user) void unmarkFilingSettled(user.uid, year, period);
                }}
                onOpenSetup={() => setSheet({ kind: 'taxSetup' })}
              />
            )}

            {view === 'spending' && (
              <>
                <SpendingBreakdown
                  transactions={transactions}
                  year={spendMonth.year}
                  month={spendMonth.month}
                  onStep={stepSpendMonth}
                  canStepForward={canStepForward}
                  monthName={monthLabel(
                    new Date(spendMonth.year, spendMonth.month, 1),
                  )}
                />
                <TransactionList
                  title={`All activity · ${transactions.length}`}
                  emptyMessage="Nothing logged yet. Add your first income or expense."
                  transactions={transactions}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </>
            )}

            {view === 'admin' && isAdmin && (
              <AdminPanel
                invitations={invitations}
                onInvite={() => setSheet({ kind: 'invite' })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav
        view={view}
        onChangeView={setView}
        onQuickAdd={() => setSheet({ kind: 'quickAdd' })}
        isAdmin={isAdmin}
        taxNeedsAttention={taxNeedsAttention}
      />

      {/* Sheets */}
      <Sheet
        open={sheet?.kind === 'quickAdd'}
        title="Add"
        onClose={closeSheet}
      >
        <div className="space-y-2.5">
          <QuickAddOption
            label="Income"
            hint="Money you received"
            onClick={() => setSheet({ kind: 'income' })}
            icon={<ArrowDownLeft className="size-5" />}
            tone="in"
          />
          <QuickAddOption
            label="Expense"
            hint="Money you spent"
            onClick={() => setSheet({ kind: 'expense' })}
            icon={<ArrowUpRight className="size-5" />}
            tone="out"
          />
          <QuickAddOption
            label="Category"
            hint="A new spending category or budget"
            onClick={() => setSheet({ kind: 'category' })}
            icon={<Target className="size-5" />}
            tone="brand"
          />
        </div>
      </Sheet>

      <Sheet
        open={sheet?.kind === 'income'}
        title={sheet?.kind === 'income' && sheet.existing ? 'Edit income' : 'Add income'}
        onClose={closeSheet}
      >
        {user && sheet?.kind === 'income' && (
          <IncomeForm
            userId={user.uid}
            existing={sheet.existing}
            onDone={closeSheet}
          />
        )}
      </Sheet>

      <Sheet
        open={sheet?.kind === 'expense'}
        title={
          sheet?.kind === 'expense' && sheet.existing ? 'Edit expense' : 'Add expense'
        }
        onClose={closeSheet}
      >
        {user && sheet?.kind === 'expense' && (
          <ExpenseForm
            userId={user.uid}
            categories={categories}
            existing={sheet.existing}
            onDone={closeSheet}
          />
        )}
      </Sheet>

      <Sheet
        open={sheet?.kind === 'category'}
        title="New category"
        description="Set a monthly budget and whether it counts as a business cost."
        onClose={closeSheet}
      >
        {user && <CategoryForm userId={user.uid} onDone={closeSheet} />}
      </Sheet>

      <Sheet
        open={sheet?.kind === 'taxSetup'}
        title="Tax setup"
        description="This decides which rates and rules the app applies."
        onClose={closeSheet}
      >
        {user && (
          <TaxSetupForm
            userId={user.uid}
            existing={data.taxProfile}
            onDone={closeSheet}
          />
        )}
      </Sheet>

      <Sheet open={sheet?.kind === 'invite'} title="Invite a user" onClose={closeSheet}>
        {user && <InviteForm adminUid={user.uid} onDone={closeSheet} />}
      </Sheet>
    </div>
  );
}

const QUICK_ADD_TONES = {
  in: 'bg-money-in/10 text-money-in-ink dark:text-money-in-ink-dark',
  out: 'bg-money-out/10 text-money-out-ink dark:text-money-out-ink-dark',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
} as const;

function QuickAddOption({
  label,
  hint,
  icon,
  tone,
  onClick,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: keyof typeof QUICK_ADD_TONES;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[var(--radius-tile)] border border-black/8 p-4 text-left transition-colors hover:bg-black/[0.03] dark:border-white/10 dark:hover:bg-white/5"
    >
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-[0.875rem] ${QUICK_ADD_TONES[tone]}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold">{label}</span>
        <span className="block text-xs text-ink-900/55 dark:text-white/50">{hint}</span>
      </span>
    </button>
  );
}
