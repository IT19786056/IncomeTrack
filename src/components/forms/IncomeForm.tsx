import { useState } from 'react';
import {
  AmountField,
  DateField,
  FormError,
  SubmitButton,
  TextField,
  ToggleField,
} from '../ui/Field';
import { fromDateInputValue, toDateInputValue } from '../../lib/format';
import { addIncome, updateIncome } from '../../lib/repository';
import type { TransactionView } from '../../types';

interface Props {
  userId: string;
  /** Present when editing an existing entry. */
  existing?: TransactionView;
  onDone: () => void;
}

export function IncomeForm({ userId, existing, onDone }: Props) {
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [source, setSource] = useState(existing?.label ?? '');
  const [date, setDate] = useState(
    toDateInputValue(existing?.date ?? new Date()),
  );
  const [description, setDescription] = useState(existing?.description ?? '');
  const [isSalary, setIsSalary] = useState(existing?.isSalary ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    const parsedDate = fromDateInputValue(date);
    if (!parsedDate) {
      setError('Pick the date you received this.');
      return;
    }

    setSaving(true);
    try {
      const draft = {
        amount: parsedAmount,
        source: source.trim(),
        date: parsedDate,
        description: description.trim(),
        isSalary,
      };
      if (existing) {
        await updateIncome(existing.id, draft);
      } else {
        await addIncome(userId, draft);
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
        label="Amount received"
        value={amount}
        onChange={setAmount}
        required
        autoFocus={!existing}
      />

      <TextField
        label="Source"
        value={source}
        onChange={setSource}
        placeholder="Client or payer"
        required
      />

      <DateField
        label="Date received"
        value={date}
        onChange={setDate}
        max={toDateInputValue(new Date())}
        required
        hint="Which year of assessment this falls in depends on this date."
      />

      <ToggleField
        label="This is my regular salary"
        hint="Your salary is already counted from the rates in Tax setup, so ticking this keeps it out of the tax total. It still counts towards your cash position. Leave it off for bonuses and one-off work, which are taxed on top."
        checked={isSalary}
        onChange={setIsSalary}
      />

      <TextField
        label="Note (optional)"
        value={description}
        onChange={setDescription}
        placeholder="Invoice number, project…"
      />

      <SubmitButton loading={saving} tone="income">
        {existing ? 'Save changes' : 'Add income'}
      </SubmitButton>
    </form>
  );
}
