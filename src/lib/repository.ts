/**
 * Every Firestore write in the app. Components call these instead of building
 * documents inline, which keeps the shape of each collection in one place.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { OperationType } from '../types';
import type { TaxProfile } from '../types';
import { handleFirestoreError } from './firestoreUtils';
import { normalizeSchedule, type FilingPeriod, type SalaryPeriod, type TaxRegime } from './tax';

export interface IncomeDraft {
  amount: number;
  source: string;
  date: Date;
  description?: string;
  /** Already covered by the salary schedule, so excluded from the tax total. */
  isSalary: boolean;
}

export interface ExpenseDraft {
  amount: number;
  category: string;
  date: Date;
  description?: string;
  deductible: boolean;
}

export async function addIncome(userId: string, draft: IncomeDraft) {
  try {
    await addDoc(collection(db, 'income'), {
      userId,
      amount: draft.amount,
      source: draft.source,
      description: draft.description ?? '',
      isSalary: draft.isSalary,
      date: Timestamp.fromDate(draft.date),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'income');
  }
}

export async function updateIncome(id: string, draft: IncomeDraft) {
  try {
    await updateDoc(doc(db, 'income', id), {
      amount: draft.amount,
      source: draft.source,
      description: draft.description ?? '',
      isSalary: draft.isSalary,
      date: Timestamp.fromDate(draft.date),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `income/${id}`);
  }
}

export async function deleteIncome(id: string) {
  try {
    await deleteDoc(doc(db, 'income', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `income/${id}`);
  }
}

export async function addExpense(userId: string, draft: ExpenseDraft) {
  try {
    await addDoc(collection(db, 'expenses'), {
      userId,
      amount: draft.amount,
      category: draft.category,
      description: draft.description ?? '',
      deductible: draft.deductible,
      date: Timestamp.fromDate(draft.date),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'expenses');
  }
}

export async function updateExpense(id: string, draft: ExpenseDraft) {
  try {
    await updateDoc(doc(db, 'expenses', id), {
      amount: draft.amount,
      category: draft.category,
      description: draft.description ?? '',
      deductible: draft.deductible,
      date: Timestamp.fromDate(draft.date),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `expenses/${id}`);
  }
}

export async function deleteExpense(id: string) {
  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
  }
}

export interface CategoryDraft {
  name: string;
  budget: number;
  deductible: boolean;
}

export async function addCategory(userId: string, draft: CategoryDraft) {
  try {
    await addDoc(collection(db, 'categories'), {
      userId,
      name: draft.name,
      budget: draft.budget,
      deductible: draft.deductible,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'categories');
  }
}

export async function deleteCategory(id: string) {
  try {
    await deleteDoc(doc(db, 'categories', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
  }
}

/** One tax profile per user, keyed by uid so it can never be duplicated. */
export async function saveTaxProfile(
  userId: string,
  settings: {
    regime: TaxRegime;
    hasTin: boolean;
    hasFiledBefore: boolean;
    salarySchedule: SalaryPeriod[];
  },
) {
  const profile: TaxProfile = {
    userId,
    regime: settings.regime,
    hasTin: settings.hasTin,
    hasFiledBefore: settings.hasFiledBefore,
    salarySchedule: normalizeSchedule(settings.salarySchedule),
    updatedAt: serverTimestamp() as unknown as null,
  };
  try {
    await setDoc(doc(db, 'taxProfiles', userId), profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `taxProfiles/${userId}`);
  }
}

/**
 * Deterministic id per user, year and period, so marking the same instalment
 * twice updates one record instead of creating duplicates.
 */
function filingId(userId: string, yaStartYear: number, period: FilingPeriod) {
  return `${userId}_${yaStartYear}_${period}`;
}

export async function markFilingSettled(
  userId: string,
  yaStartYear: number,
  period: FilingPeriod,
  amountPaid: number,
) {
  const id = filingId(userId, yaStartYear, period);
  try {
    await setDoc(doc(db, 'taxFilings', id), {
      userId,
      yaStartYear,
      period,
      status: period === 'RETURN' ? 'filed' : 'paid',
      amountPaid,
      paidAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `taxFilings/${id}`);
  }
}

export async function unmarkFilingSettled(
  userId: string,
  yaStartYear: number,
  period: FilingPeriod,
) {
  const id = filingId(userId, yaStartYear, period);
  try {
    await deleteDoc(doc(db, 'taxFilings', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `taxFilings/${id}`);
  }
}

export async function inviteUser(adminUid: string, email: string) {
  const normalised = email.trim().toLowerCase();
  await setDoc(doc(db, 'invitations', normalised), {
    email: normalised,
    invitedBy: adminUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function revokeInvitation(email: string) {
  await deleteDoc(doc(db, 'invitations', email.toLowerCase()));
}
