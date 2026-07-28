import { useId } from 'react';

/**
 * Form primitives.
 *
 * All controls are at least 44px tall so they are comfortable to hit on a
 * phone, and labels are always real <label> elements bound to their input.
 */

const CONTROL =
  'w-full rounded-[var(--radius-tile)] border border-black/10 bg-black/[0.03] px-4 py-3 text-base ' +
  'transition-colors placeholder:text-ink-900/35 focus:border-brand-500 focus:bg-white ' +
  'dark:border-white/10 dark:bg-white/5 dark:placeholder:text-white/30 dark:focus:bg-white/10';

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold tracking-wide text-ink-900/60 uppercase dark:text-white/50"
    >
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 text-xs text-ink-900/50 dark:text-white/45">{children}</p>
  );
}

interface BaseProps {
  label: string;
  hint?: string;
  required?: boolean;
}

interface TextFieldProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email';
  autoFocus?: boolean;
}

export function TextField({
  label,
  hint,
  required,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
}: TextFieldProps) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={CONTROL}
      />
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

interface AmountFieldProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

/** A large, tabular amount input — the primary field on most forms. */
export function AmountField({
  label,
  hint,
  required,
  value,
  onChange,
  autoFocus,
}: AmountFieldProps) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-semibold text-ink-900/40 dark:text-white/35">
          LKR
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required={required}
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
          className={`${CONTROL} tabular pl-14 text-2xl font-bold`}
        />
      </div>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

interface DateFieldProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  max?: string;
}

export function DateField({ label, hint, required, value, onChange, max }: DateFieldProps) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="date"
        required={required}
        value={value}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className={`${CONTROL} tabular`}
      />
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

interface SelectFieldProps extends BaseProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function SelectField({
  label,
  hint,
  required,
  value,
  onChange,
  options,
  placeholder,
}: SelectFieldProps) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CONTROL}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <Hint>{hint}</Hint>}
    </div>
  );
}

interface ToggleFieldProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A switch styled as a full-width row, so the whole row is the tap target. */
export function ToggleField({ label, hint, checked, onChange }: ToggleFieldProps) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-tile)] border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-brand-600"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold">
          {label}
        </label>
        {hint && (
          <p className="mt-0.5 text-xs text-ink-900/55 dark:text-white/50">{hint}</p>
        )}
      </div>
    </div>
  );
}

interface SubmitButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  tone?: 'brand' | 'income' | 'danger';
}

const TONES = {
  brand: 'bg-brand-600 hover:bg-brand-700',
  income: 'bg-money-in hover:brightness-95',
  danger: 'bg-money-out hover:brightness-95',
} as const;

export function SubmitButton({
  children,
  loading,
  loadingLabel = 'Saving…',
  tone = 'brand',
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`w-full rounded-[var(--radius-tile)] py-4 text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 ${TONES[tone]}`}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-[var(--radius-tile)] bg-money-out/10 px-4 py-3 text-sm font-medium text-money-out"
    >
      {children}
    </p>
  );
}
