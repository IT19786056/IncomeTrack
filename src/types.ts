import type { Timestamp } from 'firebase/firestore';
import type { FilingPeriod, TaxRegime } from './lib/tax';

/**
 * Firestore hands back a Timestamp on read, but a document written with
 * serverTimestamp() briefly echoes back null from the local cache before the
 * server value lands. Anything reading these fields must handle null.
 */
export type FirestoreDate = Timestamp | null;

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  currency: string;
  role: 'admin' | 'user';
  isInvited: boolean;
  createdAt: FirestoreDate;
}

export interface Invitation {
  id?: string;
  email: string;
  invitedBy: string;
  status: 'pending' | 'accepted';
  createdAt: FirestoreDate;
}

export interface Expense {
  id?: string;
  userId: string;
  amount: number;
  category: string;
  /** When the money was spent — set by the user, not the clock. */
  date: FirestoreDate;
  description?: string;
  /**
   * Whether this expense is claimable against business income. This is the
   * field that decides taxable income, so it is always written explicitly
   * rather than inferred from the category.
   */
  deductible: boolean;
  createdAt: FirestoreDate;
}

export interface Income {
  id?: string;
  userId: string;
  amount: number;
  source: string;
  /** When the money was received — set by the user, not the clock. */
  date: FirestoreDate;
  description?: string;
  createdAt: FirestoreDate;
}

export interface Category {
  id?: string;
  userId: string;
  name: string;
  budget: number;
  /** Default deductibility for expenses in this category. */
  deductible?: boolean;
  icon?: string;
  color?: string;
  createdAt?: FirestoreDate;
}

/** A user's tax situation. One document per user, keyed by uid. */
export interface TaxProfile {
  userId: string;
  regime: TaxRegime;
  /** Whether they hold a Taxpayer Identification Number. */
  hasTin: boolean;
  /** Whether they have ever filed a return. */
  hasFiledBefore: boolean;
  /**
   * What they expect to receive in a normal month. Used to fill months not yet
   * logged, so a mid-year pay rise isn't averaged away. Null means fall back to
   * the average of the months on record.
   */
  expectedMonthlyIncome?: number | null;
  updatedAt: FirestoreDate;
}

/** A settled instalment or return, so the app stops nagging about it. */
export interface TaxFiling {
  id?: string;
  userId: string;
  /** Year of assessment this belongs to, as a start year. YA 2026/27 → 2026. */
  yaStartYear: number;
  period: FilingPeriod;
  status: 'paid' | 'filed';
  amountPaid: number;
  paidAt: FirestoreDate;
  createdAt: FirestoreDate;
}

/**
 * A normalised income or expense for display. Building this once removes the
 * need to sniff shapes at render time, and guarantees a usable Date.
 */
export interface TransactionView {
  id: string;
  kind: 'income' | 'expense';
  amount: number;
  /** Expense category or income source. */
  label: string;
  description?: string;
  date: Date;
  deductible: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}
