import { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type {
  Category,
  Expense,
  Income,
  TaxFiling,
  TaxProfile,
  TransactionView,
} from '../types';
import {
  normalizeExpenses,
  normalizeIncome,
  sortByDateDesc,
} from '../lib/transactions';
import { deadlineKey } from '../lib/tax';

export interface FinancialData {
  expenses: Expense[];
  income: Income[];
  categories: Category[];
  /** Income and expenses merged, normalised and sorted newest first. */
  transactions: TransactionView[];
  taxProfile: TaxProfile | null;
  filings: TaxFiling[];
  /** Keys of settled deadlines, ready for `relevantDeadlines`. */
  settledDeadlines: Set<string>;
  loading: boolean;
  error: string | null;
}

/**
 * Live subscription to everything the signed-in user owns.
 *
 * Queries filter on userId only and sort client-side. The full year is needed
 * anyway to compute a year of assessment, and dropping the `orderBy` removes
 * the composite-index requirement that a userId+date query would impose.
 */
export function useFinancialData(userId: string | undefined): FinancialData {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [filings, setFilings] = useState<TaxFiling[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setExpenses([]);
      setIncome([]);
      setCategories([]);
      setTaxProfile(null);
      setFilings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const owned = (name: string) =>
      query(collection(db, name), where('userId', '==', userId));

    const onError = (operation: string) => (e: unknown) => {
      console.error(`Failed to load ${operation}`, e);
      setError(`Could not load your ${operation}. Check your connection.`);
      setLoading(false);
    };

    const unsubscribers = [
      onSnapshot(
        owned('expenses'),
        (snap) => {
          setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Expense));
          setLoading(false);
        },
        onError('expenses'),
      ),
      onSnapshot(
        owned('income'),
        (snap) => {
          setIncome(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Income));
          setLoading(false);
        },
        onError('income'),
      ),
      onSnapshot(
        owned('categories'),
        (snap) =>
          setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Category)),
        onError('categories'),
      ),
      onSnapshot(
        owned('taxFilings'),
        (snap) =>
          setFilings(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaxFiling)),
        onError('tax filings'),
      ),
      onSnapshot(
        doc(db, 'taxProfiles', userId),
        (snap) => setTaxProfile(snap.exists() ? (snap.data() as TaxProfile) : null),
        // Absent profile is the normal first-run state, not an error worth surfacing.
        (e) => console.error('Failed to load tax profile', e),
      ),
    ];

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [userId]);

  const transactions = useMemo(
    () => sortByDateDesc([...normalizeExpenses(expenses), ...normalizeIncome(income)]),
    [expenses, income],
  );

  const settledDeadlines = useMemo(
    () => new Set(filings.map((f) => deadlineKey(f))),
    [filings],
  );

  return {
    expenses,
    income,
    categories,
    transactions,
    taxProfile,
    filings,
    settledDeadlines,
    loading,
    error,
  };
}

/** Admin-only view of the invitation list. */
export function useInvitations(isAdmin: boolean) {
  const [invitations, setInvitations] = useState<
    { id: string; email: string; status: string }[]
  >([]);

  useEffect(() => {
    if (!isAdmin) {
      setInvitations([]);
      return;
    }
    return onSnapshot(
      collection(db, 'invitations'),
      (snap) =>
        setInvitations(
          snap.docs.map((d) => ({
            id: d.id,
            email: (d.data().email as string) ?? d.id,
            status: (d.data().status as string) ?? 'pending',
          })),
        ),
      // Logged, not thrown: this fires inside an onSnapshot callback, where a
      // throw escapes React's error boundary and surfaces as an uncaught error.
      (e) => console.error('Failed to load invitations', e),
    );
  }, [isAdmin]);

  return invitations;
}
