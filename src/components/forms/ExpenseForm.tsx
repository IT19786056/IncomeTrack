import { useEffect, useState } from 'react';
import {
  AmountField,
  DateField,
  FormError,
  SelectField,
  SubmitButton,
  TextField,
  ToggleField,
} from '../ui/Field';
import { fromDateInputValue, toDateInputValue } from '../../lib/format';
import { addExpense, updateExpense } from '../../lib/repository';
import type { Category, TransactionView } from '../../types';

interface Props {
  userId: string;
  categories: Category[];
  existing?: TransactionView;
  onDone: () => void;
}

/** Offered when the user has not created any categories yet. */
const STARTER_CATEGORIES = [
  'Food',
  'Transport',
  'Utilities',
  'Internet & phone',
  'Software & tools',
  'Equipment',
  'Professional fees',
  'Leisure',
];

export function ExpenseForm({ userId, categories, existing, onDone }: Props) {
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [category, setCategory] = useState(existing?.label ?? '');
  const [date, setDate] = useState(toDateInputValue(existing?.date ?? new Date()));
  const [description, setDescription] = useState(existing?.description ?? '');
  const [deductible, setDeductible] = useState(existing?.deductible ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = [
    ...categories.map((c) => ({ value: c.name, label: c.name })),
    ...STARTER_CATEGORIES.filter(
      (name) => !categories.some((c) => c.name === name),
    ).map((name) => ({ value: name, label: name })),
  ];

  // Categories can carry a default deductibility, so picking one pre-answers
  // the question. Only applies while adding — an edit keeps what was saved.
  useEffect(() => {
    if (existing) return;
    const matched = categories.find((c) => c.name === category);
    if (matched?.deductible !== undefined) setDeductible(matched.deductible);
  }, [category, categories, existing]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (!category.trim()) {
      setError('Choose a category.');
      return;
    }
    const parsedDate = fromDateInputValue(date);
    if (!parsedDate) {
      setError('Pick the date you spent this.');
      return;
    }

    setSaving(true);
    try {
      const draft = {
        amount: parsedAmount,
        category: category.trim(),
        date: parsedDate,
        description: description.trim(),
        deductible,
      };
      if (existing) {
        await updateExpense(existing.id, draft);
      } else {
        await addExpense(userId, draft);
      }
      onDone();
    } catch {
      setError('Could not save that. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormError>{error}</FormError>

      <AmountField
        label="Amount spent"
        value={amount}
        onChange={setAmount}
        required
        autoFocus={!existing}
      />

      <SelectField
        label="Category"
        value={category}
        onChange={setCategory}
        options={options}
        placeholder="Choose a category"
        required
      />

      <DateField
        label="Date spent"
        value={date}
        onChange={setDate}
        max={toDateInputValue(new Date())}
        required
      />

      <ToggleField
        label="Claim as a business expense"
        hint="Reduces your taxable income. Only tick this for costs incurred earning your consulting income."
        checked={deductible}
        onChange={setDeductible}
      />

      <TextField
        label="Note (optional)"
        value={description}
        onChange={setDescription}
        placeholder="What was this for?"
      />

      <SubmitButton loading={saving}>
        {existing ? 'Save changes' : 'Add expense'}
      </SubmitButton>
    </form>
  );
}
