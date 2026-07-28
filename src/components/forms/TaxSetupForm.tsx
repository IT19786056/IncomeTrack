import { useState } from 'react';
import { FormError, SelectField, SubmitButton, ToggleField } from '../ui/Field';
import { SalaryScheduleFields } from './SalaryScheduleFields';
import { saveTaxProfile } from '../../lib/repository';
import type { TaxProfile } from '../../types';
import { normalizeSchedule, type SalaryPeriod, type TaxRegime } from '../../lib/tax';

interface Props {
  userId: string;
  existing: TaxProfile | null;
  /** Year of assessment the salary preview is shown against. */
  yaStartYear: number;
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

export function TaxSetupForm({ userId, existing, yaStartYear, onDone }: Props) {
  const [regime, setRegime] = useState<TaxRegime>(existing?.regime ?? 'service-export');
  const [hasTin, setHasTin] = useState(existing?.hasTin ?? false);
  const [hasFiledBefore, setHasFiledBefore] = useState(existing?.hasFiledBefore ?? false);
  const [schedule, setSchedule] = useState<SalaryPeriod[]>(
    existing?.salarySchedule ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const cleaned = normalizeSchedule(schedule);
    // A row with an amount but no month would silently never apply.
    const incomplete = schedule.some(
      (row) => row.monthlyAmount > 0 && !/^\d{4}-\d{2}$/.test(row.from),
    );
    if (incomplete) {
      setError('Give every salary rate a month it starts from.');
      return;
    }

    setSaving(true);
    try {
      await saveTaxProfile(userId, {
        regime,
        hasTin,
        hasFiledBefore,
        salarySchedule: cleaned,
      });
      onDone();
    } catch {
      setError('Could not save that. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormError>{error}</FormError>

      <SalaryScheduleFields
        value={schedule}
        onChange={setSchedule}
        previewYaStartYear={yaStartYear}
      />

      <p className="rounded-[var(--radius-tile)] bg-black/[0.03] p-3.5 text-xs leading-relaxed text-ink-900/65 dark:bg-white/5 dark:text-white/60">
        Sri Lanka's tax year runs <strong>1 April to 31 March</strong>, so a rate
        starting in January counts towards the previous tax year for its first
        three months.
      </p>

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
