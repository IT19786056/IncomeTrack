import { useState } from 'react';
import { FormError, SelectField, SubmitButton, ToggleField } from '../ui/Field';
import { saveTaxProfile } from '../../lib/repository';
import type { TaxProfile } from '../../types';
import type { TaxRegime } from '../../lib/tax';

interface Props {
  userId: string;
  existing: TaxProfile | null;
  onDone: () => void;
}

const REGIME_OPTIONS: { value: TaxRegime; label: string }[] = [
  { value: 'service-export', label: 'Foreign clients, paid via a Sri Lankan bank' },
  { value: 'local-business', label: 'Sri Lankan clients / local business' },
  { value: 'employment', label: 'Employment income (employer withholds APIT)' },
];

const REGIME_NOTES: Record<TaxRegime, string> = {
  'service-export':
    'Your marginal rate is capped at 15% because the income arrives in foreign currency through a licensed local bank. Income kept offshore does not qualify.',
  'local-business':
    'Full progressive rates apply, rising to 36%. You pay by quarterly self-assessment.',
  employment:
    'Your employer should deduct APIT from each payslip, so there is usually nothing for you to pay directly.',
};

export function TaxSetupForm({ userId, existing, onDone }: Props) {
  const [regime, setRegime] = useState<TaxRegime>(existing?.regime ?? 'service-export');
  const [hasTin, setHasTin] = useState(existing?.hasTin ?? false);
  const [hasFiledBefore, setHasFiledBefore] = useState(existing?.hasFiledBefore ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await saveTaxProfile(userId, { regime, hasTin, hasFiledBefore });
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

      <SelectField
        label="How you earn"
        value={regime}
        onChange={(value) => setRegime(value as TaxRegime)}
        options={REGIME_OPTIONS}
        required
      />

      <p className="rounded-[var(--radius-tile)] bg-brand-50 p-3.5 text-xs leading-relaxed text-brand-900 dark:bg-brand-900/20 dark:text-brand-100">
        {REGIME_NOTES[regime]}
      </p>

      <ToggleField
        label="I have a TIN"
        hint="A Taxpayer Identification Number from the IRD. You need one before you can pay."
        checked={hasTin}
        onChange={setHasTin}
      />

      <ToggleField
        label="I have filed a return before"
        hint="Helps the app tell you which filings are genuinely outstanding."
        checked={hasFiledBefore}
        onChange={setHasFiledBefore}
      />

      <SubmitButton loading={saving}>Save tax setup</SubmitButton>
    </form>
  );
}
