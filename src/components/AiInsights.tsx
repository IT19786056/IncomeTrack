import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Sparkles } from 'lucide-react';
import { money } from '../lib/format';
import type { TaxComputation } from '../lib/tax';
import type { Totals } from '../lib/transactions';

interface Props {
  yearTotals: Totals;
  tax: TaxComputation;
}

/**
 * Gemini is used for commentary only — never for arithmetic. Every figure it
 * receives has already been computed by the tax engine, so a hallucinated
 * number can't reach a total the user relies on.
 *
 * SECURITY: VITE_GEMINI_API_KEY is bundled into the client, so anyone with the
 * deployed JavaScript can read and spend it. This needs to move behind a server
 * endpoint (a Cloud Function or similar) before the app is shared publicly.
 */
export function AiInsights({ yearTotals, tax }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setError('No Gemini API key is configured.');
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are advising a Sri Lankan independent consultant. All figures are already calculated — do not recalculate or restate them as different numbers.

Year of assessment ${tax.yaLabel}:
- Income received: LKR ${money(yearTotals.income)}
- Total expenses: LKR ${money(yearTotals.expenses)}
- Of which claimed as business expenses: LKR ${money(tax.deductibleExpenses)}
- Taxable income after LKR ${money(tax.personalRelief)} personal relief: LKR ${money(tax.taxableIncome)}
- Income tax for the year: LKR ${money(tax.totalTax)}

Give three short, specific, actionable suggestions to improve their position — cash flow, expense claims they may be missing as a consultant, or timing. Be concrete about Sri Lankan circumstances. Under 110 words total. No preamble, no headings.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      setInsight(response.text ?? null);
      if (!response.text) setError('No suggestions came back. Try again.');
    } catch (caught) {
      console.error('Insight generation failed', caught);
      setError('Could not reach the AI service. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-card)] bg-white p-5 sm:p-6 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold tracking-tight">
          <Sparkles className="size-4 text-brand-600 dark:text-brand-400" />
          Suggestions
        </h2>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="shrink-0 rounded-full bg-brand-100 px-4 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-200 disabled:opacity-60 dark:bg-brand-900/40 dark:text-brand-200"
        >
          {loading ? 'Thinking…' : insight ? 'Refresh' : 'Generate'}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-money-out-ink dark:text-money-out-ink-dark">
          {error}
        </p>
      )}

      {insight ? (
        <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-ink-900/75 dark:text-white/70">
          {insight}
        </p>
      ) : (
        !error && (
          <p className="mt-4 text-sm text-ink-900/50 dark:text-white/45">
            Get suggestions based on your income, claimed expenses and tax position.
          </p>
        )
      )}
    </section>
  );
}
