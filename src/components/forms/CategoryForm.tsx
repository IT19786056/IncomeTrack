import { useState } from 'react';
import {
  AmountField,
  FormError,
  SubmitButton,
  TextField,
  ToggleField,
} from '../ui/Field';
import { addCategory } from '../../lib/repository';

interface Props {
  userId: string;
  onDone: () => void;
}

export function CategoryForm({ userId, onDone }: Props) {
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [deductible, setDeductible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Give the category a name.');
      return;
    }
    const parsedBudget = Number(budget || 0);
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
      setError('Enter a monthly budget of zero or more.');
      return;
    }

    setSaving(true);
    try {
      await addCategory(userId, { name: name.trim(), budget: parsedBudget, deductible });
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

      <TextField
        label="Category name"
        value={name}
        onChange={setName}
        placeholder="Internet & phone"
        required
        autoFocus
      />

      <AmountField
        label="Monthly budget"
        value={budget}
        onChange={setBudget}
        hint="Leave at zero if you only want to categorise, not budget."
      />

      <ToggleField
        label="Business expense by default"
        hint="New expenses in this category will be claimed against your income automatically."
        checked={deductible}
        onChange={setDeductible}
      />

      <SubmitButton loading={saving}>Add category</SubmitButton>
    </form>
  );
}
